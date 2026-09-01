// BikeShare SaaS - Archivo de servidor principal

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const config = require('./config/index');
const db = require('./db/database');
const seed = require('./db/seed');

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
const bikeStatusesRoutes = require('./routes/bike-statuses');

app.use('/api/auth', authRoutes);
app.use('/api/bikes', bikesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/bike-statuses', bikeStatusesRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// Poblar la base de datos la primera vez (datos de ejemplo y usuario admin).
// En despliegues limpios (p. ej. Dokploy/Nixpacks) la BD no incluye datos;
// si está vacía la inicializamos para que la app sea usable.
(function initDatabase() {
  const bikesCount = db.prepare('SELECT COUNT(*) AS n FROM bikes').get().n;
  if (bikesCount === 0) {
    console.log('📦 Base de datos vacía: cargando datos iniciales...');
    seed();
  } else {
    // Asegurar que existen los estados de bicicleta por defecto, incluso si
    // la BD ya tiene datos pero la tabla de estados está vacía (por ejemplo,
    // bases creadas antes de añadir la funcionalidad de estados).
    const statusCount = db.prepare('SELECT COUNT(*) AS n FROM bike_statuses').get().n;
    if (statusCount === 0) {
      console.log('⚙️  Añadiendo estados de bicicleta por defecto...');
      const { writeCollection } = require('./db/store');
      writeCollection('bikeStatuses', [
        { id: 'st-disponible', name: 'disponible', label: 'Disponible', color: 'green', isDefault: 1, sortOrder: 1 },
        { id: 'st-alquilada', name: 'alquilada', label: 'Alquilada', color: 'primary', isDefault: 1, sortOrder: 2 },
        { id: 'st-reparacion', name: 'en_reparacion', label: 'En reparación', color: 'orange', isDefault: 1, sortOrder: 3 },
        { id: 'st-baja', name: 'baja', label: 'Dada de baja', color: 'red', isDefault: 1, sortOrder: 4 }
      ]);
    }
    console.log('✅ Base de datos ya inicializada.');
  }
})();

app.listen(PORT, () => {
  console.log(`🔧 BikeShare SaaS corriendo en http://localhost:${PORT}`);
});
