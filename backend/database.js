const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'barberia.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Tabla Barberos
  db.run(`CREATE TABLE IF NOT EXISTS barberos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    activo INTEGER DEFAULT 1,
    telefono TEXT
  )`, () => {
    // Añadimos la columna telefono si no existe
    db.run("ALTER TABLE barberos ADD COLUMN telefono TEXT", () => { });
  });

  // Tabla Usuarios (Login y Roles)
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT NOT NULL, -- 'admin' o 'barbero'
    barbero_id INTEGER,
    FOREIGN KEY(barbero_id) REFERENCES barberos(id)
  )`);

  // Tabla Servicios
  db.run(`CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    duracion_min INTEGER NOT NULL
  )`);

  // Tabla Citas
  db.run(`CREATE TABLE IF NOT EXISTS citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    fecha_hora TEXT NOT NULL, -- ISO String
    barbero_id INTEGER,
    servicio TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente', -- pendiente, completada, cancelada
    FOREIGN KEY(barbero_id) REFERENCES barberos(id)
  )`, () => {
    // Añadimos las nuevas columnas si no existen (ignorando el error si ya existen)
    db.run("ALTER TABLE citas ADD COLUMN comprobante_id TEXT", () => { });
    db.run("ALTER TABLE citas ADD COLUMN anticipo_pagado REAL", () => { });
    db.run("ALTER TABLE citas ADD COLUMN duracion_total INTEGER DEFAULT 60", () => { });
  });

  // Seed data
  db.get("SELECT COUNT(*) as count FROM barberos", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO barberos (nombre, telefono) VALUES (?, ?)");
      stmt.run("YAHIR GAMBOA ROSAS", "522291056547");
      stmt.run("ISABEL ROSAS GARCIA", "522297783905");
      stmt.run("REGINA ROSAS GARCIA", "522296524053", () => {
        // Al terminar de crear los barberos, creamos los usuarios
        db.get("SELECT COUNT(*) as ucount FROM usuarios", (err, urow) => {
          if (urow.ucount === 0) {
             const ustmt = db.prepare("INSERT INTO usuarios (usuario, password, rol, barbero_id) VALUES (?, ?, ?, ?)");
             // Admin (Dueña) - Puede ver todo
             ustmt.run("isabeladmin", "12345", "admin", 2); 
             // Barberos (Solo ven lo suyo)
             ustmt.run("yahir", "1234", "barbero", 1);
             ustmt.run("isabel", "1234", "barbero", 2);
             ustmt.run("regina", "1234", "barbero", 3);
             ustmt.finalize();
             console.log("Usuarios iniciales creados.");
          }
        });
      });
      stmt.finalize();
      console.log("Barberos insertados con teléfonos.");
    } else {
      // Si los barberos ya existen, nos aseguramos de crear los usuarios si no existen
      db.get("SELECT COUNT(*) as ucount FROM usuarios", (err, urow) => {
        if (urow && urow.ucount === 0) {
           const ustmt = db.prepare("INSERT INTO usuarios (usuario, password, rol, barbero_id) VALUES (?, ?, ?, ?)");
           ustmt.run("isabeladmin", "12345", "admin", 2); 
           ustmt.run("yahir", "1234", "barbero", 1);
           ustmt.run("isabel", "1234", "barbero", 2);
           ustmt.run("regina", "1234", "barbero", 3);
           ustmt.finalize();
           console.log("Usuarios iniciales creados en base existente.");
        }
      });
    }
  });

  db.get("SELECT COUNT(*) as count FROM servicios", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO servicios (nombre, precio, duracion_min) VALUES (?, ?, ?)");
      stmt.run("Arreglo de ceja", 40, 15);
      stmt.run("Barba sola", 100, 30);
      stmt.run("Barba y corte", 200, 60);
      stmt.run("Corte de dama", 140, 45);
      stmt.run("Alisado xpress (Precio base)", 250, 90);
      stmt.finalize();
      console.log("Servicios insertados.");
    }
  });
});

module.exports = db;
