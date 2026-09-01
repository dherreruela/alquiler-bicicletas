// Rutas de autenticación y gestión de usuarios
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db/store');

const { readCollection, writeCollection, generateId } = store;

// Login de usuario
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const users = readCollection('users');
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  // Verificar contraseña (si está cifrada usamos bcrypt, si es texto plano la comparamos)
  let valid = false;
  if (user.password.startsWith('$2')) {
    valid = await bcrypt.compare(password, user.password);
  } else {
    valid = password === user.password;
  }

  if (!valid) {
    return res.status(401).json({ error: 'Credenciales incorrectas.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
});

// Obtener usuarios (admin)
router.get('/users', (req, res) => {
  const users = readCollection('users');
  const safe = users.map(({ password, ...rest }) => rest);
  res.json(safe);
});

// Crear nuevo usuario (sin autenticación en esta demo)
router.post('/users', async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const users = readCollection('users');
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'El usuario ya existe.' });
  }

  const hashed = await bcrypt.hash(password, config.bcryptRounds);
  const newUser = {
    id: generateId(),
    username,
    password: hashed,
    name: name || username,
    role: role || 'operator'
  };

  users.push(newUser);
  writeCollection('users', users);

  const { password: pw, ...safe } = newUser;
  res.status(201).json(safe);
});

module.exports = router;
