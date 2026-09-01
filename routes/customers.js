// Rutas para gestión de clientes
const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const { readCollection, writeCollection, generateId } = store;

const COLLECTION = 'customers';

// Obtener todos los clientes
router.get('/', authenticate, (req, res) => {
  const customers = readCollection(COLLECTION);
  // Añadir número de reservas por cliente
  const bookings = readCollection('bookings');
  const result = customers.map(c => ({
    ...c,
    totalBookings: bookings.filter(b => b.customerId === c.id).length
  }));
  res.json(result);
});

// Buscar cliente por email
router.get('/search', authenticate, (req, res) => {
  const { email, name } = req.query;
  const customers = readCollection(COLLECTION);
  let result = customers;
  if (email) {
    result = result.filter(c => c.email && c.email.toLowerCase().includes(email.toLowerCase()));
  }
  if (name) {
    result = result.filter(c => c.name && c.name.toLowerCase().includes(name.toLowerCase()));
  }
  res.json(result);
});

// Obtener cliente por id
router.get('/:id', authenticate, (req, res) => {
  const customers = readCollection(COLLECTION);
  const customer = customers.find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }
  res.json(customer);
});

// Crear cliente
router.post('/', authenticate, (req, res) => {
  const { name, email, phone, idCard } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name y email son obligatorios.' });
  }

  const customers = readCollection(COLLECTION);
  if (customers.find(c => c.email === email)) {
    return res.status(409).json({ error: 'Ya existe un cliente con ese email.' });
  }

  const newCustomer = {
    id: generateId(),
    name,
    email,
    phone: phone || '',
    idCard: idCard || '',
    createdAt: new Date().toISOString()
  };

  customers.push(newCustomer);
  writeCollection(COLLECTION, customers);
  res.status(201).json(newCustomer);
});

// Actualizar cliente
router.put('/:id', authenticate, (req, res) => {
  const customers = readCollection(COLLECTION);
  const index = customers.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  const updated = { ...customers[index], ...req.body, id: customers[index].id };
  customers[index] = updated;
  writeCollection(COLLECTION, customers);
  res.json(updated);
});

// Eliminar cliente
router.delete('/:id', authenticate, (req, res) => {
  const customers = readCollection(COLLECTION);
  const filtered = customers.filter(c => c.id !== req.params.id);
  if (filtered.length === customers.length) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }
  writeCollection(COLLECTION, filtered);
  res.json({ message: 'Cliente eliminado correctamente.' });
});

module.exports = router;
