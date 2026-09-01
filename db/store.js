// Capa de almacenamiento basada en SQLite.
// Mantiene la misma interfaz (readCollection/writeCollection) pero ahora
// persiste en una base de datos SQLite en lugar de archivos JSON.

const db = require('./database');

// Mapeo del nombre de la colección a la tabla y su clave primaria
const COLLECTION_TABLE = {
  bikes: { table: 'bikes', id: 'id' },
  stations: { table: 'stations', id: 'id' },
  customers: { table: 'customers', id: 'id' },
  bookings: { table: 'bookings', id: 'id' },
  users: { table: 'users', id: 'id' },
  pricing: { table: 'pricing', id: 'id' }
};

// Lista de columnas por tabla (para construir las consultas)
function getColumns(table) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.map(c => c.name);
}

// Leer toda una colección (todas las filas de una tabla)
function readCollection(name) {
  const meta = COLLECTION_TABLE[name];
  if (!meta) {
    throw new Error(`Colección no registrada: ${name}`);
  }
  return db.prepare(`SELECT * FROM ${meta.table}`).all();
}

// Escribir una colección completa en la base de datos.
// Con SQLite no necesitamos volver a escribir todo el archivo;
// insertamos o actualizamos cada registro según corresponda.
function writeCollection(name, data) {
  const meta = COLLECTION_TABLE[name];
  if (!meta) {
    throw new Error(`Colección no registrada: ${name}`);
  }
  const table = meta.table;
  const columns = getColumns(table);

  // Consulta de upsert: INSERT ... ON CONFLICT(id) DO UPDATE
  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = columns
    .filter(c => c !== meta.id)
    .map(c => `${c} = excluded.${c}`)
    .join(', ');

  const upsertSql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(${meta.id}) DO UPDATE SET ${updateClause}
  `;

  const insertStmt = db.prepare(upsertSql);
  const transaction = db.transaction((rows) => {
    for (const row of rows) {
      const values = columns.map(col => row[col] !== undefined ? row[col] : null);
      insertStmt.run(values);
    }
  });

  transaction(data);
}

// Vaciar una tabla (para el seed, para evitar datos duplicados)
function clearCollection(name) {
  const meta = COLLECTION_TABLE[name];
  if (!meta) {
    throw new Error(`Colección no registrada: ${name}`);
  }
  db.prepare(`DELETE FROM ${meta.table}`).run();
}

// Eliminar un registro por id
function deleteById(name, id) {
  const meta = COLLECTION_TABLE[name];
  if (!meta) {
    throw new Error(`Colección no registrada: ${name}`);
  }
  db.prepare(`DELETE FROM ${meta.table} WHERE ${meta.id} = ?`).run(id);
}

// Insertar un único registro (retorna el id)
function insert(name, row) {
  const meta = COLLECTION_TABLE[name];
  const table = meta.table;
  const columns = getColumns(table);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => row[col] !== undefined ? row[col] : null);
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(values);
  return row[meta.id];
}

// Actualizar un registro por id
function updateById(name, id, changes) {
  const meta = COLLECTION_TABLE[name];
  const table = meta.table;
  const columns = Object.keys(changes).filter(c => c !== meta.id);
  if (columns.length === 0) return;
  const setClause = columns.map(c => `${c} = ?`).join(', ');
  const values = columns.map(c => changes[c]);
  values.push(id);
  db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${meta.id} = ?`).run(values);
}

// Genera un id único para nuevos registros
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

function dbInstance() {
  return db;
}

module.exports = {
  readCollection,
  writeCollection,
  clearCollection,
  deleteById,
  insert,
  updateById,
  generateId,
  dbInstance
};
