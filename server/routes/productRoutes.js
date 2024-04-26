const express = require('express');
const Product = require('../models/product');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Cart = require('../models/cart');
const { Op } = require('sequelize');

router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    console.error("Erreur lors de la création du produit:", error);
    res.status(400).send(error);
  }
});

router.get('/', async (req, res) => {
  try {
    const search = req.query.search;
    let products;
    if (search) {
      products = await Product.findAll({
        where: { libelle: { [Op.like]: '%' + search + '%' } }
      });
    } else {
      products = await Product.findAll();
    }
    
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send("Une erreur s'est produite lors de la récupération des produits.");
  }
});
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      res.status(200).send(product);
    } else {
      res.status(404).send({ message: 'Product not found!' });
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// Middleware pour faire correspondre le token JWT envoyé par le client avec celui stocké dans la base de données
const authenticateToken = async (req, res, next) => {
  try {
      // console.log(req.headers);
      const token = req.headers.authorization.split(' ')[1];
      const payload = jwt.verify(token, 'your_secret_key');
      // console.log(payload);
      const user = await User.findByPk(payload.userId);
      if (user && user.token === token) {
          req.user = payload;
          next();
      } else {
          res.status(401).send({ message: "Unauthorized" });
      }
  } catch (error) {
      console.log(error);
      res.status(401).send({ message: "Unauthorized" });
  }
};

router.put('/:id', authenticateToken, async (req, res) => {
  try {
      const product = await Product.update(req.body, {
          where: { id: req.params.id }
      });
      if (product[0]) {
          res.status(200).send({ message: 'Product updated.' });
      } else {
          res.status(404).send({ message: 'Product not found!' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
});

// Suppression d'un produit - Route protégée
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
      const deleted = await Product.destroy({
          where: { id: req.params.id }
      });
      if (deleted) {
          res.status(200).send({ message: 'Product deleted.' });
      } else {
          res.status(404).send({ message: 'Product not found!' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
});

router.post('/add-to-cart', authenticateToken, async (req, res) => {
  try {
      const product = await Product.findByPk(req.body.productId);
      if (product) {
          let cart = await Cart.findOne({ where: { userId: req.user.userId } });
          if (!cart) {
              cart = await Cart.create({ userId: req.user.userId });
          }
          await cart.addProduct(product, { through: { quantity: req.body.quantity } });
          res.status(201).send({ message: 'Product added to cart.' });
      } else {
          res.status(404).send({ message: 'Product not found!' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
}
);

router.get('/cart', authenticateToken, async (req, res) => {
  try {
      const cart = await Cart.findOne({ where: { userId: req.user.userId }, include: Product });
      if (cart) {
          res.status(200).send(cart);
      } else {
          res.status(404).send({ message: 'Cart not found!' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
}
);

router.delete('/cart/:productId', authenticateToken, async (req, res) => {
  try {
      const product = await Product.findByPk(req.params.productId);
      if (product) {
          const cart = await Cart.findOne({ where: { userId: req.user.userId } });
          if (cart) {
              await cart.removeProduct(product);
              res.status(200).send({ message: 'Product removed from cart.' });
          } else {
              res.status(404).send({ message: 'Cart not found!' });
          }
      } else {
          res.status(404).send({ message: 'Product not found!' });
      }
  } catch (error) {
      res.status(500).send(error);
  }
}
);

module.exports = router;
