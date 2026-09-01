// Script para cargar datos de ejemplo (seed) en la base de datos JSON.

const store = require('./store');
const { writeCollection, clearCollection } = store;

// Datos de ejemplo: bicicletas
const bikes = [
  { id: 'b1', bikeNumber: 'BIKE-001', name: 'Montañera Trek', type: 'Montaña', status: 'disponible', stationId: 'st1', pricePerHour: 3.5, createdAt: new Date().toISOString() },
  { id: 'b2', bikeNumber: 'BIKE-002', name: 'Urbana City', type: 'Urbana', status: 'disponible', stationId: 'st1', pricePerHour: 2.5, createdAt: new Date().toISOString() },
  { id: 'b3', bikeNumber: 'BIKE-003', name: 'Eléctrica Volt', type: 'Eléctrica', status: 'alquilada', stationId: null, pricePerHour: 6.0, createdAt: new Date().toISOString() },
  { id: 'b4', bikeNumber: 'BIKE-004', name: 'Montañera Trail', type: 'Montaña', status: 'en_reparacion', stationId: 'st2', pricePerHour: 3.5, createdAt: new Date().toISOString() },
  { id: 'b5', bikeNumber: 'BIKE-005', name: 'Urbana Via', type: 'Urbana', status: 'disponible', stationId: 'st2', pricePerHour: 2.5, createdAt: new Date().toISOString() },
  { id: 'b6', bikeNumber: 'BIKE-006', name: 'Eléctrica Speed', type: 'Eléctrica', status: 'disponible', stationId: 'st3', pricePerHour: 6.0, createdAt: new Date().toISOString() },
  { id: 'b7', bikeNumber: 'BIKE-007', name: 'Infantil Junior', type: 'Infantil', status: 'disponible', stationId: 'st3', pricePerHour: 2.0, createdAt: new Date().toISOString() },
  { id: 'b8', bikeNumber: 'BIKE-008', name: 'Montañera Aventura', type: 'Montaña', status: 'disponible', stationId: 'st1', pricePerHour: 3.5, createdAt: new Date().toISOString() }
];

// Estaciones
const stations = [
  { id: 'st1', name: 'Estación Centro', address: 'Calle Mayor 10', city: 'Madrid', capacity: 20 },
  { id: 'st2', name: 'Estación Parque', address: 'Av. del Parque 5', city: 'Madrid', capacity: 15 },
  { id: 'st3', name: 'Estación Estación de Tren', address: 'Estación Central 1', city: 'Madrid', capacity: 25 }
];

// Clientes
const customers = [
  { id: 'c1', name: 'Ana García', email: 'ana@example.com', phone: '+34 600 111 222', idCard: '12345678A', createdAt: new Date().toISOString() },
  { id: 'c2', name: 'Luis Pérez', email: 'luis@example.com', phone: '+34 600 333 444', idCard: '87654321B', createdAt: new Date().toISOString() },
  { id: 'c3', name: 'Marta López', email: 'marta@example.com', phone: '+34 600 555 666', idCard: '11223344C', createdAt: new Date().toISOString() }
];

// Reservas
const bookings = [
  {
    id: 'book1', bookingNumber: 'BK-1001', customerId: 'c1', bikeId: 'b3',
    startStationId: 'st1', endStationId: 'st2',
    startTime: new Date().toISOString(), endTime: null,
    totalPrice: 0, status: 'activa', createdAt: new Date().toISOString()
  },
  {
    id: 'book2', bookingNumber: 'BK-1002', customerId: 'c2', bikeId: 'b1',
    startStationId: 'st1', endStationId: 'st3',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 3600000).toISOString(),
    totalPrice: 3.5, status: 'completada', createdAt: new Date().toISOString()
  },
  {
    id: 'book3', bookingNumber: 'BK-1003', customerId: 'c3', bikeId: 'b2',
    startStationId: 'st2', endStationId: 'st1',
    startTime: new Date(Date.now() - 5400000).toISOString(), endTime: null,
    totalPrice: 0, status: 'activa', createdAt: new Date().toISOString()
  }
];

// Usuarios administradores
const users = [
  { id: 'u1', username: 'admin', password: 'admin123', name: 'Administrador Principal', role: 'admin' },
  { id: 'u2', username: 'operador', password: 'operador123', name: 'Operador Turno', role: 'operator' }
];

// Tarifas
const pricing = [
  { id: 'p1', bikeType: 'Urbana', pricePerHour: 2.5, pricePerDay: 15, extraHour: 1.5 },
  { id: 'p2', bikeType: 'Montaña', pricePerHour: 3.5, pricePerDay: 22, extraHour: 2 },
  { id: 'p3', bikeType: 'Eléctrica', pricePerHour: 6.0, pricePerDay: 35, extraHour: 3 },
  { id: 'p4', bikeType: 'Infantil', pricePerHour: 2.0, pricePerDay: 10, extraHour: 1 }
];

// Estados de bicicleta (configurables)
const bikeStatuses = [
  { id: 'st-disponible', name: 'disponible', label: 'Disponible', color: 'green', isDefault: 1, sortOrder: 1 },
  { id: 'st-alquilada', name: 'alquilada', label: 'Alquilada', color: 'primary', isDefault: 1, sortOrder: 2 },
  { id: 'st-reparacion', name: 'en_reparacion', label: 'En reparación', color: 'orange', isDefault: 1, sortOrder: 3 },
  { id: 'st-baja', name: 'baja', label: 'Dada de baja', color: 'red', isDefault: 1, sortOrder: 4 }
];

// Guardar todos los datos
function seed() {
  // Limpiar tablas antes de insertar para evitar duplicados al re-ejecutar.
  // Orden importante: primero las tablas con claves foráneas (bookings),
  // y hacia el final las tablas que son referenciadas.
  clearCollection('bookings');
  clearCollection('bikeStatuses');
  clearCollection('bikes');
  clearCollection('stations');
  clearCollection('customers');
  clearCollection('users');
  clearCollection('pricing');

  writeCollection('bikes', bikes);
  writeCollection('stations', stations);
  writeCollection('customers', customers);
  writeCollection('bookings', bookings);
  writeCollection('users', users);
  writeCollection('pricing', pricing);
  writeCollection('bikeStatuses', bikeStatuses);
  console.log('✅ Datos de ejemplo cargados correctamente');
}

// Si se ejecuta directamente (node db/seed.js)
if (require.main === module) {
  seed();
}

module.exports = seed;
