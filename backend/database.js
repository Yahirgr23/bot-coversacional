const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    // Tabla Barberos
    await client.query(`
      CREATE TABLE IF NOT EXISTS barberos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        activo INTEGER DEFAULT 1,
        telefono TEXT
      )
    `);

    // Tabla Usuarios (Login y Roles)
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT NOT NULL,
        barbero_id INTEGER REFERENCES barberos(id)
      )
    `);

    // Tabla Servicios
    await client.query(`
      CREATE TABLE IF NOT EXISTS servicios (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        duracion_min INTEGER NOT NULL
      )
    `);

    // Tabla Citas
    await client.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id SERIAL PRIMARY KEY,
        cliente_nombre TEXT NOT NULL,
        cliente_telefono TEXT NOT NULL,
        fecha_hora TEXT NOT NULL,
        barbero_id INTEGER REFERENCES barberos(id),
        servicio TEXT NOT NULL,
        status TEXT DEFAULT 'pendiente',
        comprobante_id TEXT,
        anticipo_pagado REAL,
        duracion_total INTEGER DEFAULT 60,
        reprogramaciones INTEGER DEFAULT 0
      )
    `);

    // Seed Barberos
    const { rows: barberoRows } = await client.query('SELECT COUNT(*) as count FROM barberos');
    if (parseInt(barberoRows[0].count) === 0) {
      await client.query(`
        INSERT INTO barberos (nombre, telefono) VALUES
        ('YAHIR GAMBOA ROSAS', '5212291086547'),
        ('ISABEL ROSAS GARCIA', '5212297783905'),
        ('REGINA ROSAS GARCIA', '5212296524053')
      `);
      console.log('Barberos insertados.');
    }

    // Seed Usuarios
    const { rows: userRows } = await client.query('SELECT COUNT(*) as count FROM usuarios');
    if (parseInt(userRows[0].count) === 0) {
      await client.query(`
        INSERT INTO usuarios (usuario, password, rol, barbero_id) VALUES
        ('isabeladmin', '12345', 'admin', 2),
        ('yahir', '1234', 'barbero', 1),
        ('isabel', '1234', 'barbero', 2),
        ('regina', '1234', 'barbero', 3)
      `);
      console.log('Usuarios iniciales creados.');
    }

    // Seed Servicios
    const { rows: servicioRows } = await client.query('SELECT COUNT(*) as count FROM servicios');
    if (parseInt(servicioRows[0].count) === 0) {
      await client.query(`
        INSERT INTO servicios (nombre, precio, duracion_min) VALUES
        ('Arreglo de ceja', 40, 15),
        ('Barba sola', 100, 30),
        ('Barba y corte', 200, 60),
        ('Corte de dama', 140, 45),
        ('Alisado xpress (Precio base)', 200, 90),
        ('Corte clásico', 120, 30)
      `);
      console.log('Servicios insertados.');
    }

    console.log('Base de datos PostgreSQL inicializada correctamente.');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err.message);
  } finally {
    client.release();
  }
}

initDB();

module.exports = pool;
