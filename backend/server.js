require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database'); // Pool de pg
const { processMessage, setSock } = require('./bot');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, 'uploads');
const authDir = path.join(dataDir, 'auth_info_baileys');

// Asegurar que la carpeta uploads exista
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ==========================================
// RUTAS DE CONFIGURACIÓN BANCARIA
// ==========================================

app.get('/api/config', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT clave, valor FROM configuracion");
    const config = {};
    rows.forEach(r => config[r.clave] = r.valor);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', async (req, res) => {
  const { clabe, nombre_titular } = req.body;
  try {
    if (clabe) await db.query("UPDATE configuracion SET valor = $1 WHERE clave = 'clabe'", [clabe]);
    if (nombre_titular) await db.query("UPDATE configuracion SET valor = $1 WHERE clave = 'nombre_titular'", [nombre_titular]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RUTAS API FRONTEND (ADMIN)
// ==========================================

app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  try {
    const { rows } = await db.query(
      "SELECT id, usuario, rol, barbero_id FROM usuarios WHERE usuario = $1 AND password = $2",
      [usuario, password]
    );
    if (rows.length === 0) return res.status(401).json({ error: "Credenciales incorrectas" });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/citas', async (req, res) => {
  const { barbero_id } = req.query;
  try {
    let query = `
      SELECT c.id, c.cliente_nombre, c.cliente_telefono, c.fecha_hora, c.servicio, c.status,
             b.nombre as barbero, c.comprobante_id, c.anticipo_pagado, c.comprobante_url
      FROM citas c
      LEFT JOIN barberos b ON c.barbero_id = b.id
    `;
    const params = [];
    if (barbero_id) {
      query += ` WHERE c.barbero_id = $1`;
      params.push(barbero_id);
    }
    query += ` ORDER BY c.fecha_hora DESC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/citas/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status === 'completada' || status === 'cancelada') {
      const { rows } = await db.query("SELECT comprobante_url FROM citas WHERE id = $1", [id]);
      if (rows.length > 0 && rows[0].comprobante_url) {
        const fs = require('fs');
        const path = require('path');
        const fileName = path.basename(rows[0].comprobante_url);
        const filePath = path.join(uploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await db.query("UPDATE citas SET comprobante_url = NULL WHERE id = $1", [id]);
      }
    }

    await db.query("UPDATE citas SET status = $1 WHERE id = $2", [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barberos', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM barberos");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RUTAS GESTIÓN DE USUARIOS
// ==========================================

app.get('/api/usuarios', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.usuario, u.password, u.rol, u.barbero_id, b.nombre as barbero_nombre
      FROM usuarios u
      LEFT JOIN barberos b ON u.barbero_id = b.id
      ORDER BY u.id ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const { usuario, password, rol, barbero_id } = req.body;
  try {
    const bId = barbero_id || null;
    await db.query(
      "INSERT INTO usuarios (usuario, password, rol, barbero_id) VALUES ($1, $2, $3, $4)",
      [usuario, password, rol, bId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { usuario, password, rol, barbero_id } = req.body;
  try {
    const bId = barbero_id || null;
    await db.query(
      "UPDATE usuarios SET usuario = $1, password = $2, rol = $3, barbero_id = $4 WHERE id = $5",
      [usuario, password, rol, bId, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/barberos', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM barberos ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/barberos', async (req, res) => {
  const { nombre, telefono } = req.body;
  try {
    await db.query("INSERT INTO barberos (nombre, telefono) VALUES ($1, $2)", [nombre, telefono]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/barberos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono } = req.body;
  try {
    await db.query("UPDATE barberos SET nombre = $1, telefono = $2 WHERE id = $3", [nombre, telefono, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/barberos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM barberos WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RUTAS GESTIÓN DE SERVICIOS
// ==========================================
app.get('/api/servicios', async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM servicios ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servicios', async (req, res) => {
  const { nombre, precio, duracion_min, tipo_precio } = req.body;
  try {
    await db.query(
      "INSERT INTO servicios (nombre, precio, duracion_min, tipo_precio) VALUES ($1, $2, $3, $4)",
      [nombre, precio, duracion_min, tipo_precio || 'fijo']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/servicios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, duracion_min, tipo_precio } = req.body;
  try {
    await db.query(
      "UPDATE servicios SET nombre = $1, precio = $2, duracion_min = $3, tipo_precio = $4 WHERE id = $5",
      [nombre, precio, duracion_min, tipo_precio || 'fijo', id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/servicios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM servicios WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WHATSAPP BAILEYS (Reemplazo de Meta Webhook)
// ==========================================

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // Puedes cambiar a 'info' para ver más logs
    browser: ['Barberia ISA Bot', 'Chrome', '1.0.0']
  });

  // Pasamos el socket al bot para que pueda enviar notificaciones a barberos
  setSock(sock);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n======================================================');
      console.log('¡ATENCIÓN! Si el QR de arriba se ve borroso o estirado,');
      console.log('DA CLIC EN EL SIGUIENTE ENLACE PARA VERLO BIEN:');
      console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada. ¿Reconectar?', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot de WhatsApp conectado y listo.');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const remoteJid = msg.key.remoteJid;
    // Solo respondemos a mensajes directos, ignorar grupos o status
    if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return;

    // Extraer número de teléfono (JID)
    const phone = remoteJid.split('@')[0];
    
    let text = "";
    let imageData = null;

    const messageType = Object.keys(msg.message)[0];

    if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
      text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    } else if (messageType === 'imageMessage') {
      text = msg.message.imageMessage?.caption || "Te envío el comprobante de transferencia.";
      try {
        const buffer = await downloadMediaMessage(
          msg,
          'buffer',
          { },
          { 
            logger: pino({ level: 'silent' }),
            reuploadRequest: sock.updateMediaMessage
          }
        );
        imageData = {
          buffer: buffer,
          mimeType: msg.message.imageMessage.mimetype
        };
      } catch (err) {
        console.error("Error descargando imagen de WhatsApp:", err);
      }
    }

    if (text || imageData) {
      try {
        const replyText = await processMessage(phone, text, imageData);
        if (replyText) {
          const messagesToSend = replyText.split('|||').map(m => m.trim()).filter(m => m.length > 0);
          for (const msgContent of messagesToSend) {
            await sock.sendMessage(remoteJid, { text: msgContent });
          }
        }
      } catch (e) {
        console.error("Error al procesar mensaje con el bot:", e);
      }
    }
  });
}

// Iniciar WhatsApp
connectToWhatsApp();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
