// Rutas para gestión de tarifas/precios
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId } = store;

const COLLECTION = 'pricing';

// Obtener todas las tarifas
router.get('/', authenticate, (req, res) => {
  res.json(readCollection(COLLECTION));
});

// Obtener tarifa por tipo de bicicleta
router.get('/type/:bikeType', authenticate, (req, res) => {
  const pricing = readCollection(COLLECTION);
  const found = pricing.find(p => p.bikeType.toLowerCase() === req.params.bikeType.toLowerCase());
  if (!found) {
    return res.status(404).json({ error: 'No hay tarifa para ese tipo de bicicleta.' });
  }
  res.json(found);
});

// Crear tarifa
router.post('/', authenticate, (req, res) => {
  const { bikeType, pricePerHour, pricePerDay, extraHour } = req.body;
  if (!bikeType || !pricePerHour) {
    return res.status(400).json({ error: 'bikeType y pricePerHour son obligatorios.' });
  }

  const pricing = readCollection(COLLECTION);
  if (pricing.find(p => p.bikeType.toLowerCase() === bikeType.toLowerCase())) {
    return res.status(409).json({ error: 'Ya existe una tarifa para ese tipo de bicicleta.' });
  }

  const newPricing = {
    id: generateId(),
    bikeType,
    pricePerHour: parseFloat(pricePerHour),
    pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
    extraHour: extraHour ? parseFloat(extraHour) : 0
  };

  pricing.push(newPricing);
  writeCollection(COLLECTION, pricing);
  res.status(201).json(newPricing);
});

// Actualizar tarifa
router.put('/:id', authenticate, (req, res) => {
  const pricing = readCollection(COLLECTION);
  const index = pricing.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Tarifa no encontrada.' });
  }

  const updated = { ...pricing[index], ...req.body, id: pricing[index].id };
  pricing[index] = updated;
  writeCollection(COLLECTION, pricing);
  res.json(updated);
});

// Eliminar tarifa
router.delete('/:id', authenticate, (req, res) => {
  const pricing = readCollection(COLLECTION);
  const filtered = pricing.filter(p => p.id !== req.params.id);
  if (filtered.length === pricing.length) {
    return res.status(404).json({ error: 'Tarifa no encontrada.' });
  }
  writeCollection(COLLECTION, filtered);
  res.json({ message: 'Tarifa eliminada correctamente.' });
});

module.exports = router;
