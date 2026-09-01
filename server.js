// BikeShare SaaS - Archivo de servidor principal

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('./config/index');

const app = express();
const PORT = config.port;
// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
const authRoutes = require('./routes/auth');
const bikesRoutes = require('./routes/bikes');
const bookingsRoutes = require('./routes/bookings');
const customersRoutes = require('./routes/customers');
const stationsRoutes = require('./routes/stations');
const reportsRoutes = require('./routes/reports');
const pricingRoutes = require('./routes/pricing');

app.use('/api/auth', authRoutes);
app.use('/api/bikes', bikesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/pricing', pricingRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🔧 BikeShare SaaS corriendo en http://localhost:${PORT}`);
});

