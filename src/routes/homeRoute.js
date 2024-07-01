const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.redirect('/home');
});

router.get('/home', (req, res) => {
  res.render('homeView', { title: 'Inicio'});
});

router.get('/about', (req, res) => {
  res.render('aboutView', { title: 'About' });
});

module.exports = router;
