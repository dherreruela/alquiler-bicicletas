// Middleware de autenticación usando JWT
const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware para proteger rutas
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Se requiere token.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// Middleware para verificar rol de administrador
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }
  next();
}

// Middleware para verificar rol de operador o admin
function isStaff(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'operator')) {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de personal.' });
  }
  next();
}

module.exports = { authenticate, isAdmin, isStaff };
