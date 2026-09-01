// Rutas para reportes y estadísticas del negocio
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection } = store;

// Panel de resumen general
router.get('/summary', authenticate, (req, res) => {
  const bikes = readCollection('bikes');
  const bookings = readCollection('bookings');
  const customers = readCollection('customers');
  const stations = readCollection('stations');

  const totalRevenue = bookings
    .filter(b => b.status === 'completada')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  res.json({
    totalBikes: bikes.length,
    availableBikes: bikes.filter(b => b.status === 'disponible').length,
    rentedBikes: bikes.filter(b => b.status === 'alquilada').length,
    inRepair: bikes.filter(b => b.status === 'en_reparacion').length,
    totalBookings: bookings.length,
    activeBookings: bookings.filter(b => b.status === 'activa').length,
    completedBookings: bookings.filter(b => b.status === 'completada').length,
    cancelledBookings: bookings.filter(b => b.status === 'cancelada').length,
    totalCustomers: customers.length,
    totalStations: stations.length,
    totalRevenue: totalRevenue.toFixed(2)
  });
});

// Reporte de ingresos por tipo de bicicleta
router.get('/revenue-by-type', authenticate, (req, res) => {
  const bookings = readCollection('bookings');
  const bikes = readCollection('bikes');

  const revenueByType = {};

  bookings.filter(b => b.status === 'completada').forEach(b => {
    const bike = bikes.find(x => x.id === b.bikeId);
    const type = bike ? bike.type : 'Desconocido';
    revenueByType[type] = (revenueByType[type] || 0) + (b.totalPrice || 0);
  });

  res.json(revenueByType);
});

// Reporte de utilización de estaciones
router.get('/station-utilization', authenticate, (req, res) => {
  const stations = readCollection('stations');
  const bikes = readCollection('bikes');

  const result = stations.map(s => {
    const stationBikes = bikes.filter(b => b.stationId === s.id);
    return {
      ...s,
      currentBikes: stationBikes.length,
      available: stationBikes.filter(b => b.status === 'disponible').length,
      utilization: s.capacity ? Math.round((stationBikes.length / s.capacity) * 100) : 0
    };
  });

  res.json(result);
});

// Actividad reciente (últimas reservas)
router.get('/recent-bookings', authenticate, (req, res) => {
  const bookings = readCollection('bookings');
  const customers = readCollection('customers');
  const bikes = readCollection('bikes');

  const recent = bookings
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(b => ({
      ...b,
      customer: customers.find(c => c.id === b.customerId)?.name || 'N/A',
      bike: bikes.find(x => x.id === b.bikeId)?.bikeNumber || 'N/A'
    }));

  res.json(recent);
});

// Promedio de duración de alquileres
router.get('/avg-duration', authenticate, (req, res) => {
  const bookings = readCollection('bookings');
  const completed = bookings.filter(b => b.status === 'completada' && b.startTime && b.endTime);

  if (completed.length === 0) {
    return res.json({ averageMinutes: 0, count: 0 });
  }

  const totalMinutes = completed.reduce((sum, b) => {
    const diff = new Date(b.endTime) - new Date(b.startTime);
    return sum + (diff / 60000);
  }, 0);

  res.json({
    averageMinutes: Math.round(totalMinutes / completed.length),
    count: completed.length
  });
});

module.exports = router;
