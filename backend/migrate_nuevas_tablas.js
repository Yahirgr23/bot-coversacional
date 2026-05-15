require('dotenv').config();
const db = require('./database');

async function migrate() {
  console.log('🚀 Ejecutando migración: nuevas tablas de ausencias y días cerrados...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ausencias_barbero (
        id         SERIAL PRIMARY KEY,
        barbero_id INTEGER NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
        fecha      DATE NOT NULL,
        motivo     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(barbero_id, fecha)
      );
    `);
    console.log('✅ Tabla ausencias_barbero creada (o ya existía).');

    await db.query(`
      CREATE TABLE IF NOT EXISTS dias_cerrados (
        id         SERIAL PRIMARY KEY,
        fecha      DATE NOT NULL UNIQUE,
        motivo     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla dias_cerrados creada (o ya existía).');

    console.log('\n🎉 Migración completada exitosamente.');
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
  } finally {
    await db.end();
  }
}

migrate();
