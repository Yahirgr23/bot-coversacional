const db = require('./database');

db.serialize(() => {
  db.run("DELETE FROM servicios", (err) => {
    if (err) console.error("Error al borrar:", err);
    else console.log("Servicios anteriores borrados.");
  });

  const stmt = db.prepare("INSERT INTO servicios (nombre, precio, duracion_min) VALUES (?, ?, ?)");
  stmt.run("Arreglo de ceja", 40, 15);
  stmt.run("Barba sola", 100, 30);
  stmt.run("Barba y corte", 200, 60);
  stmt.run("Corte de dama", 140, 45);
  stmt.run("Alisado xpress (Precio base)", 250, 90);
  stmt.finalize(() => {
    console.log("Nuevos servicios insertados.");
  });
});
