// Rutas para gestión de reservas/alquileres
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId } = store;

const COLLECTION = 'bookings';

// Función auxiliar para calcular precio
function calculatePrice(bike, hours) {
  // redondea horas hacia arriba
  const h = Math.ceil(hours);
  return (bike.pricePerHour * h).toFixed(2);
}

// Obtener todas las reservas
router.get('/', authenticate, (req, res) => {
  const bookings = readCollection(COLLECTION);
  const bikes = readCollection('bikes');
  const customers = readCollection('customers');
  const stations = readCollection('stations');

  const result = bookings.map(b => ({
    ...b,
    bike: bikes.find(x => x.id === b.bikeId) || null,
    customer: customers.find(x => x.id === b.customerId) || null,
    startStation: stations.find(x => x.id === b.startStationId) || null,
    endStation: stations.find(x => x.id === b.endStationId) || null
  }));

  res.json(result);
});

// Obtener reservas por estado
router.get('/status/:status', authenticate, (req, res) => {
  const bookings = readCollection(COLLECTION);
  const filtered = bookings.filter(b => b.status === req.params.status);
  res.json(filtered);
});

// Obtener una reserva por id
router.get('/:id', authenticate, (req, res) => {
  const bookings = readCollection(COLLECTION);
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }
  res.json(booking);
});

// Crear reserva
router.post('/', authenticate, (req, res) => {
  const { customerId, bikeId, startStationId, startTime } = req.body;
  if (!customerId || !bikeId || !startStationId) {
    return res.status(400).json({ error: 'customerId, bikeId y startStationId son obligatorios.' });
  }

  const bikes = readCollection('bikes');
  const bike = bikes.find(b => b.id === bikeId);
  if (!bike) {
    return res.status(404).json({ error: 'Bicicleta no encontrada.' });
  }
  if (bike.status === 'alquilada') {
    return res.status(409).json({ error: 'La bicicleta ya está alquilada.' });
  }

  const customers = readCollection('customers');
  if (!customers.find(c => c.id === customerId)) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  const bookings = readCollection(COLLECTION);
  const bookingNumber = 'BK-' + (1000 + bookings.length + 1);

  const newBooking = {
    id: generateId(),
    bookingNumber,
    customerId,
    bikeId,
    startStationId,
    endStationId: null,
    startTime: startTime || new Date().toISOString(),
    endTime: null,
    totalPrice: 0,
    status: 'activa',
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  writeCollection(COLLECTION, bookings);

  // Marcar bicicleta como alquilada
  bike.status = 'alquilada';
  bike.stationId = null;
  writeCollection('bikes', bikes);

  res.status(201).json(newBooking);
});

// Completar reserva (devolver bicicleta)
router.post('/:id/return', authenticate, (req, res) => {
  const { endStationId } = req.body;
  if (!endStationId) {
    return res.status(400).json({ error: 'endStationId es obligatorio.' });
  }

  const bookings = readCollection(COLLECTION);
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }
  if (booking.status !== 'activa') {
    return res.status(400).json({ error: 'La reserva ya fue completada o cancelada.' });
  }

  const endTime = new Date();
  const startTime = new Date(booking.startTime);
  const hours = (endTime - startTime) / 3600000;

  const bikes = readCollection('bikes');
  const bike = bikes.find(b => b.id === booking.bikeId);
  const price = calculatePrice(bike, hours);

  booking.endTime = endTime.toISOString();
  booking.endStationId = endStationId;
  booking.totalPrice = parseFloat(price);
  booking.status = 'completada';

  writeCollection(COLLECTION, bookings);

  // Liberar bicicleta en la estación de destino
  bike.status = 'disponible';
  bike.stationId = endStationId;
  writeCollection('bikes', bikes);

  res.json(booking);
});

// Cancelar reserva
router.post('/:id/cancel', authenticate, (req, res) => {
  const bookings = readCollection(COLLECTION);
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }
  if (booking.status !== 'activa') {
    return res.status(400).json({ error: 'Solo se pueden cancelar reservas activas.' });
  }

  // Liberar la bicicleta
  const bikes = readCollection('bikes');
  const bike = bikes.find(b => b.id === booking.bikeId);
  if (bike) {
    bike.status = 'disponible';
    bike.stationId = booking.startStationId;
    writeCollection('bikes', bikes);
  }

  booking.status = 'cancelada';
  booking.endTime = new Date().toISOString();
  writeCollection(COLLECTION, bookings);

  res.json(booking);
});

// Eliminar reserva
router.delete('/:id', authenticate, (req, res) => {
  const bookings = readCollection(COLLECTION);
  const filtered = bookings.filter(b => b.id !== req.params.id);
  if (filtered.length === bookings.length) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }
  writeCollection(COLLECTION, filtered);
  res.json({ message: 'Reserva eliminada correctamente.' });
});

module.exports = router;
