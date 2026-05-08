require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./database');
const { processMessage } = require('./bot');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTAS API FRONTEND (ADMIN)
// ==========================================

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  db.get("SELECT id, usuario, rol, barbero_id FROM usuarios WHERE usuario = ? AND password = ?", [usuario, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Credenciales incorrectas" });
    res.json({ success: true, user: row });
  });
});

app.get('/api/citas', (req, res) => {
  const { barbero_id } = req.query;
  
  let query = `
    SELECT c.id, c.cliente_nombre, c.cliente_telefono, c.fecha_hora, c.servicio, c.status, b.nombre as barbero, c.comprobante_id, c.anticipo_pagado
    FROM citas c
    LEFT JOIN barberos b ON c.barbero_id = b.id
  `;
  const params = [];
  
  if (barbero_id) {
    query += ` WHERE c.barbero_id = ? `;
    params.push(barbero_id);
  }
  
  query += ` ORDER BY c.fecha_hora DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.patch('/api/citas/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run("UPDATE citas SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/barberos', (req, res) => {
  db.all("SELECT * FROM barberos", [], (err, rows) => {
    res.json(rows || []);
  });
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
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
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
        // Enviar typing indicator
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
