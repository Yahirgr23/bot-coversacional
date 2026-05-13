require('dotenv').config();
const pool = require('./database');

async function modifyServicesTable() {
  try {
    await pool.query("ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tipo_precio TEXT DEFAULT 'fijo'");
    await pool.query("UPDATE servicios SET tipo_precio = 'desde' WHERE nombre ILIKE '%alisado%'");
    console.log("Columna tipo_precio añadida y actualizada con éxito.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

modifyServicesTable();
