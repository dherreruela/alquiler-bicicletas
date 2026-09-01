// Rutas para gestión de estaciones
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId } = store;

const COLLECTION = 'stations';

// Obtener todas las estaciones
router.get('/', authenticate, (req, res) => {
  const stations = readCollection(COLLECTION);
  // Añadir conteo de bicicletas disponibles por estación
  const bikes = readCollection('bikes');
  const result = stations.map(s => ({
    ...s,
    availableBikes: bikes.filter(b => b.stationId === s.id && b.status === 'disponible').length
  }));
  res.json(result);
});

// Obtener una estación por id
router.get('/:id', authenticate, (req, res) => {
  const stations = readCollection(COLLECTION);
  const station = stations.find(s => s.id === req.params.id);
  if (!station) {
    return res.status(404).json({ error: 'Estación no encontrada.' });
  }
  res.json(station);
});

// Crear estación
router.post('/', authenticate, (req, res) => {
  const { name, address, city, capacity } = req.body;
  if (!name || !address || !city) {
    return res.status(400).json({ error: 'name, address y city son obligatorios.' });
  }

  const stations = readCollection(COLLECTION);
  const newStation = {
    id: generateId(),
    name,
    address,
    city,
    capacity: capacity || 10,
    createdAt: new Date().toISOString()
  };

  stations.push(newStation);
  writeCollection(COLLECTION, stations);
  res.status(201).json(newStation);
});

// Actualizar estación
router.put('/:id', authenticate, (req, res) => {
  const stations = readCollection(COLLECTION);
  const index = stations.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Estación no encontrada.' });
  }

  const updated = { ...stations[index], ...req.body, id: stations[index].id };
  stations[index] = updated;
  writeCollection(COLLECTION, stations);
  res.json(updated);
});

// Eliminar estación
router.delete('/:id', authenticate, (req, res) => {
  const stations = readCollection(COLLECTION);
  const filtered = stations.filter(s => s.id !== req.params.id);
  if (filtered.length === stations.length) {
    return res.status(404).json({ error: 'Estación no encontrada.' });
  }
  writeCollection(COLLECTION, filtered);
  res.json({ message: 'Estación eliminada correctamente.' });
});

module.exports = router;
