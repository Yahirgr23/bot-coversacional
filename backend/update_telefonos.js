const db = require('./database');

db.serialize(() => {
  db.run("ALTER TABLE barberos ADD COLUMN telefono TEXT", (err) => {
    // ignorar si ya existe
    db.run("UPDATE barberos SET telefono = '522291056547' WHERE nombre = 'YAHIR GAMBOA ROSAS'");
    db.run("UPDATE barberos SET telefono = '522297783905' WHERE nombre = 'ISABEL ROSAS GARCIA'");
    db.run("UPDATE barberos SET telefono = '522296524053' WHERE nombre = 'REGINA ROSAS GARCIA'", () => {
      console.log("Teléfonos actualizados correctamente");
    });
  });
});
