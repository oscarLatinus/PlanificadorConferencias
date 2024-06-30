const express = require('express');
const path = require('path');
const homeRouter = require('./routes/homeRoute');

const app = express();

// Configuración del motor de plantillas
app.set('views', 'src/views');
app.set('view engine', 'ejs');

// Archivos estáticos
app.use(express.static('src/public'));

// Rutas
app.use('/', homeRouter);

module.exports = app;


