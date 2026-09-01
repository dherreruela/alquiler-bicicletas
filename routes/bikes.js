// Rutas para gestión de bicicletas
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId } = store;

const COLLECTION = 'bikes';

// Obtener todas las bicicletas (autenticado)
router.get('/', authenticate, (req, res) => {
  const bikes = readCollection(COLLECTION);
  res.json(bikes);
});

// Obtener bicicletas por estado: /api/bikes/status/disponible
router.get('/status/:status', authenticate, (req, res) => {
  const bikes = readCollection(COLLECTION);
  const filtered = bikes.filter(b => b.status === req.params.status);
  res.json(filtered);
});

// Obtener una bicicleta por id
router.get('/:id', authenticate, (req, res) => {
  const bikes = readCollection(COLLECTION);
  const bike = bikes.find(b => b.id === req.params.id);
  if (!bike) {
    return res.status(404).json({ error: 'Bicicleta no encontrada.' });
  }
  res.json(bike);
});

// Crear nueva bicicleta
router.post('/', authenticate, (req, res) => {
  const { bikeNumber, name, type, status, stationId, pricePerHour } = req.body;
  if (!bikeNumber || !name || !type) {
    return res.status(400).json({ error: 'bikeNumber, name y type son obligatorios.' });
  }

  const bikes = readCollection(COLLECTION);
  if (bikes.find(b => b.bikeNumber === bikeNumber)) {
    return res.status(409).json({ error: 'Ya existe una bicicleta con ese número.' });
  }

  const newBike = {
    id: generateId(),
    bikeNumber,
    name,
    type,
    status: status || 'disponible',
    stationId: stationId || null,
    pricePerHour: pricePerHour || 0,
    createdAt: new Date().toISOString()
  };

  bikes.push(newBike);
  writeCollection(COLLECTION, bikes);
  res.status(201).json(newBike);
});

// Actualizar bicicleta
router.put('/:id', authenticate, (req, res) => {
  const bikes = readCollection(COLLECTION);
  const index = bikes.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Bicicleta no encontrada.' });
  }

  const updated = { ...bikes[index], ...req.body, id: bikes[index].id };
  bikes[index] = updated;
  writeCollection(COLLECTION, bikes);
  res.json(updated);
});

// Cambiar estado de una bicicleta
router.patch('/:id/status', authenticate, (req, res) => {
  const { status } = req.body;
  // Validar que el estado existe en la tabla de estados configurables
  const validStatuses = readCollection('bikeStatuses').map(s => s.name);
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado no válido.' });
  }

  const bikes = readCollection(COLLECTION);
  const index = bikes.findIndex(b => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Bicicleta no encontrada.' });
  }

  bikes[index].status = status;
  writeCollection(COLLECTION, bikes);
  res.json(bikes[index]);
});

// Eliminar bicicleta
router.delete('/:id', authenticate, (req, res) => {
  const bikes = readCollection(COLLECTION);
  const filtered = bikes.filter(b => b.id !== req.params.id);
  if (filtered.length === bikes.length) {
    return res.status(404).json({ error: 'Bicicleta no encontrada.' });
  }
  writeCollection(COLLECTION, filtered);
  res.json({ message: 'Bicicleta eliminada correctamente.' });
});

module.exports = router;
