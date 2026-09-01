// Rutas para gestión de estados de bicicletas (configurables)
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId, deleteById } = store;

const COLLECTION = 'bikeStatuses';

// Obtener todos los estados (autenticado)
router.get('/', authenticate, (req, res) => {
  const statuses = readCollection(COLLECTION);
  res.json(statuses);
});

// Crear un nuevo estado
router.post('/', authenticate, (req, res) => {
  const { name, label, color, sortOrder } = req.body;
  if (!name || !label) {
    return res.status(400).json({ error: 'name y label son obligatorios.' });
  }

  const statuses = readCollection(COLLECTION);
  if (statuses.find(s => s.name === name)) {
    return res.status(409).json({ error: 'Ya existe un estado con ese nombre.' });
  }

  const newStatus = {
    id: generateId(),
    name,
    label,
    color: color || 'secondary',
    isDefault: 0,
    sortOrder: sortOrder || statuses.length + 1
  };

  statuses.push(newStatus);
  writeCollection(COLLECTION, statuses);
  res.status(201).json(newStatus);
});

// Actualizar un estado
router.put('/:id', authenticate, (req, res) => {
  const statuses = readCollection(COLLECTION);
  const index = statuses.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Estado no encontrado.' });
  }

  const updated = { ...statuses[index], ...req.body, id: statuses[index].id };
  statuses[index] = updated;
  writeCollection(COLLECTION, statuses);
  res.json(updated);
});

// Eliminar un estado
router.delete('/:id', authenticate, (req, res) => {
  const statuses = readCollection(COLLECTION);
  const target = statuses.find(s => s.id === req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Estado no encontrado.' });
  }

  // Comprobar si hay bicicletas usando este estado
  const bikes = readCollection('bikes');
  const usedBy = bikes.filter(b => b.status === target.name);
  if (usedBy.length > 0) {
    return res.status(400).json({
      error: `No puedes eliminar este estado porque ${usedBy.length} bicicleta(s) lo están usando.`
    });
  }

  if (target.isDefault) {
    return res.status(400).json({ error: 'Este es un estado por defecto del sistema y no se puede eliminar.' });
  }

  deleteById(COLLECTION, req.params.id);
  res.json({ message: 'Estado eliminado correctamente.' });
});

module.exports = router;
