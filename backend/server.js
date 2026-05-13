require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database'); // Pool de pg
const { processMessage } = require('./bot');

const app = express();
app.use(cors());
app.use(express.json());

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
             b.nombre as barbero, c.comprobante_id, c.anticipo_pagado
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

// ==========================================
// WHATSAPP WEBHOOK
// ==========================================

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "ISA_TOKEN_2026";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || "";

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const phone = msg.from;
      let text = "";
      let imageData = null;

      if (msg.type === "text") {
        text = msg.text.body;
      } else if (msg.type === "image") {
        text = msg.image.caption || "Te envío el comprobante de transferencia.";
        try {
          const imageId = msg.image.id;
          const urlRes = await axios.get(`https://graph.facebook.com/v19.0/${imageId}`, {
            headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` }
          });
          const downloadUrl = urlRes.data.url;
          const imageRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` }
          });
          imageData = {
            buffer: Buffer.from(imageRes.data),
            mimeType: msg.image.mime_type
          };
        } catch (err) {
          console.error("Error descargando imagen de WhatsApp:", err);
        }
      }

      if (text || imageData) {
        try {
          const replyText = await processMessage(phone, text, imageData);
          if (META_ACCESS_TOKEN && replyText) {
            const messagesToSend = replyText.split('|||').map(m => m.trim()).filter(m => m.length > 0);
            for (const msgContent of messagesToSend) {
              await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
                messaging_product: "whatsapp",
                to: phone,
                type: "text",
                text: { body: msgContent }
              }, { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } });
            }
          } else {
            console.log("Respuesta generada (no enviada):", replyText);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
