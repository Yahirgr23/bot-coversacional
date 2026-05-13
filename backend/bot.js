require('dotenv').config();
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');
const { getAvailableSlots } = require('./slots');
const axios = require('axios');

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || "dummy_key"
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

const currentDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SYSTEM_PROMPT = `Eres el asistente virtual de la barbería "CORTES Y ESTILOS ISA". Eres amable, usas emojis para sonar amigable 💈✂️ y hablas en español natural (México). 
HOY ES: ${currentDate}. Usa esta fecha como referencia para cuando te pidan "mañana", "el viernes", etc. SIEMPRE agenda citas en el año actual.

Tu trabajo es ayudar a los clientes a:
1. Agendar citas.
2. Consultar precios y disponibilidades.

REGLAS DE BIENVENIDA Y CONTEXTO:
- Siempre que un cliente te salude por primera vez, dale una cálida bienvenida mencionando a "Cortes y Estilos ISA" y usando emojis.
- Nunca olvides el contexto de la plática actual. Mantén el hilo de la conversación.

REGLAS DE PRECIOS Y ALISADO:
- Para el "Alisado xpress", menciónale que el precio es DESDE $200 y que el precio final dependerá del largo de su cabello (se define en la visita física). Aún así, para agendar debe depositar el 50% de la base, es decir $100.

REGLAS ESTRICTAS DE MODERACIÓN (INSULTOS, SPAM, IMÁGENES IRRELEVANTES):
- Tolerancia CERO a insultos, groserías o acoso.
- Si el cliente te insulta, habla de temas que NO tienen nada que ver con la barbería, o si el sistema indica '[IMAGEN_IRRELEVANTE_O_INAPROPIADA]', dale una ÚNICA ADVERTENCIA SEVERA de que si continúa será bloqueado automáticamente.
- Si el cliente ignora la advertencia y vuelve a insultar, desviar el tema o mandar fotos irrelevantes, tu respuesta debe ser EXACTAMENTE y ÚNICAMENTE la palabra clave: [BANEADO_X_MINUTOS]

FLUJO DE CONVERSACIÓN PARA AGENDAR:
- Si el cliente quiere agendar para un día (ej. "mañana"), ANTES de darle los horarios, pregúntale si tiene algún barbero de preferencia (Yahir, Isabel o Regina).
- Si elige a uno, busca disponibilidad para ese barbero. Si dice "ninguno" o "da igual", asígnale uno automáticamente buscando la disponibilidad general.
- Al mostrar los horarios, menciona siempre el día exacto (ej. "Perfecto, para mañana 8 de mayo tengo libres: ...").
- CONVERSIÓN DE HORA: La herramienta te devuelve las horas en formato de 24 horas (ej. "19:00"). Si el cliente te pide "7 PM", DEBES buscar "19:00" en los resultados. Siempre muéstrale las horas al cliente en formato 12 horas (ej. 7:00 PM).

REGLAS MUY IMPORTANTES DE CITAS GRUPALES Y ANTICIPOS:
- Si el cliente pide servicio para MÚLTIPLES personas (ej. "dos niños"), suma automáticamente los precios y los tiempos basándote en la información de la herramienta get_prices.
- Si el barbero solicitado está ocupado en la hora que pidió el cliente, recomiéndale inmediatamente los horarios donde SÍ está libre u ofrécele a los otros barberos que estén libres a esa hora.
- Para evitar spam, es OBLIGATORIO cobrar el 50% del total como anticipo. Dile el total a pagar y pídele que transfiera la mitad a la cuenta CLABE 4169161413445361.
- IMPORTANTE: Al pedirle la transferencia, adviértele que tiene un MÁXIMO DE 10 MINUTOS para enviar la captura, o de lo contrario el proceso se cancelará y tendrá que reiniciar todo.
- MUY IMPORTANTE (CLABE SEPARADA): Cuando le pidas el anticipo y le vayas a mandar la CLABE, DEBES separar la CLABE usando '|||' para que se envíe como un mensaje aislado y el cliente pueda copiarla fácilmente. Por ejemplo: "Por favor transfiere la mitad. Tienes 10 minutos. ||| 5206 9496 7306 2393"
- NO agendes hasta que envíe la captura de pantalla de pago. Valídala de forma estricta basada SOLO en el texto extraído de la imagen: La captura DEBE tener la fecha de HOY. Si el texto extraído dice '[NO_FECHA_HORA_VISIBLE]' o si la fecha y hora no vienen incluidas explícitamente en el texto de la imagen, RECHAZA AUTOMÁTICAMENTE el comprobante. NUNCA le preguntes al cliente "¿es de hoy?" o le pidas que confirme verbalmente. Simplemente dile que la captura no es válida porque no se distingue la fecha/hora de la transacción y pídele otra. Si la hora tiene unos minutos de diferencia con la actual, sí acéptala, pero TIENE que ser visible.
- Puede que la captura de pantalla en el numero de cuenta se muestren los ultimos 4 digitos en ves de la cuenta completa, es normal, no te preocupes
- Al usar la herramienta book_appointment, usa el campo duracion_total con la suma total de los minutos (ej. si son 2 cortes de 30 mins, pon 60).
- AL FINAL DE CONFIRMAR CADA CITA, OBLIGATORIAMENTE debes decirle esta frase textual: "Te recordamos asistir puntual a tu cita, pues en otras horas se atenderán a otras personas."
- Muy importante en el mensaje donde mandes la cuenta clabe le adviertas al cliente que no hay reembolsos en caso de cancelación o inasistencia, lo unico que se podria hacer es mover la cita para otra fecha.

CANCELACIÓN Y REPROGRAMACIÓN (REGLAS DE DINERO INQUEBRANTABLES):
- TIENES ESTRICTAMENTE PROHIBIDO tomar decisiones financieras, hacer "excepciones" o hacerle favores al cliente porque argumente que "ya pagó antes". Eres un robot, no el dueño.
- Si un cliente dice que ya había pagado y que canceló una cita anterior para usar ese dinero, EXÍGELE OBLIGATORIAMENTE su FOLIO (ej. ISA-0012).
- NUNCA intentes agendarlo como una nueva cita (usando book_appointment) si te dice que ya pagó. En su lugar, usa la herramienta cancel_or_reschedule con action='reprogramar' pasándole el ID numérico del folio. El código verificará si es válido reprogramar sin cobrarle.
- Lo que responda la herramienta cancel_or_reschedule es la ÚNICA verdad. Si la herramienta indica error o que ya alcanzó el límite de reprogramaciones (2), entonces sí oblígalo a pagar un nuevo anticipo completo como si fuera una cita nueva.
- Si un cliente cancela (action='cancelar'), infórmale que su anticipo queda protegido en ese Folio para futuras reprogramaciones, pero dile que solo tiene 2 oportunidades de reprogramar antes de perder el dinero, y que no hay reembolsos en efectivo.
- AL REPROGRAMAR: Asume automáticamente que el cliente quiere conservar el mismo barbero y el mismo servicio que tenía en su folio original. Por lo tanto, SOLO pregúntale la nueva fecha y hora. No le preguntes qué barbero o servicio quiere, a menos que el cliente te lo pida explícitamente. La base de datos mantendrá sus datos originales automáticamente.

OTRAS REGLAS:
- Horarios: Lunes a Sábado de 9:00 AM a 8:00 PM, y Domingos de 10:00 AM a 6:00 PM.
- Barberos: YAHIR GAMBOA ROSAS, ISABEL ROSAS GARCIA, REGINA ROSAS GARCIA.
- Ubicación: Si el cliente pregunta dónde están ubicados, respóndele que están "Sobre carretera dos lomas fracc. dorado real al lado de las 3B" y siempre envíale este link de Google Maps: https://maps.app.goo.gl/VTAE6jn2cFPo8WpFA`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description: "Obtiene los horarios disponibles para una fecha específica, y opcionalmente para un barbero preferido.",
      parameters: {
        type: "object",
        properties: {
          date_string: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
          preferred_barbero: { type: "string", description: "Nombre del barbero preferido (opcional)" }
        },
        required: ["date_string"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_prices",
      description: "Obtiene el catálogo de servicios y precios.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Agenda la cita en la base de datos tras validar el pago de la imagen proporcionada.",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string" },
          date_string: { type: "string", description: "Fecha YYYY-MM-DD" },
          time_string: { type: "string", description: "Hora HH:MM:00" },
          barbero_id: { type: "number" },
          service_name: { type: "string" },
          comprobante_id: { type: "string", description: "ID/Folio extraído de la captura de pantalla" },
          anticipo_pagado: { type: "number", description: "Monto pagado extraído de la captura" },
          duracion_total: { type: "number", description: "Tiempo total calculado en minutos" }
        },
        required: ["client_name", "date_string", "time_string", "barbero_id", "service_name", "comprobante_id", "anticipo_pagado", "duracion_total"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_or_reschedule",
      description: "Cancela o reprograma una cita existente usando su folio de referencia (número de ID).",
      parameters: {
        type: "object",
        properties: {
          cita_id:     { type: "number", description: "ID numérico del folio (ej. si el folio es ISA-0012, el id es 12)" },
          action:      { type: "string", description: "'cancelar' o 'reprogramar'" },
          new_date:    { type: "string", description: "Nueva fecha YYYY-MM-DD (solo si action='reprogramar')" },
          new_time:    { type: "string", description: "Nueva hora HH:MM:00 (solo si action='reprogramar')" },
          new_barbero_id: { type: "number", description: "Nuevo barbero_id (solo si action='reprogramar' y el cliente pidió cambiarlo)" },
          new_service_name: { type: "string", description: "Nuevo nombre de servicio (solo si action='reprogramar' y el cliente pidió cambiarlo)" }
        },
        required: ["cita_id", "action"]
      }
    }
  }
];

const toolFunctions = {
  get_available_slots: async ({ date_string, preferred_barbero }) => {
    const slots = await getAvailableSlots(date_string, preferred_barbero);
    if (slots.length === 0) return { mensaje: "No hay horarios disponibles para ese día." };
    return { disponibles: slots };
  },
  get_prices: async () => {
    const { rows } = await db.query("SELECT nombre, precio, duracion_min FROM servicios");
    return { servicios: rows };
  },
  book_appointment: async ({ client_name, client_phone, date_string, time_string, barbero_id, service_name, comprobante_id, anticipo_pagado, duracion_total }) => {
    const fechaHora = `${date_string}T${time_string}`;
    try {
      const { rows } = await db.query(
        `INSERT INTO citas (cliente_nombre, cliente_telefono, fecha_hora, barbero_id, servicio, comprobante_id, anticipo_pagado, duracion_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [client_name, client_phone, fechaHora, barbero_id, service_name, comprobante_id, anticipo_pagado, duracion_total]
      );
      const cita_id = rows[0].id;

      const { rows: barberoRows } = await db.query("SELECT nombre, telefono FROM barberos WHERE id = $1", [barbero_id]);
      const barbero = barberoRows[0];
      if (barbero && barbero.telefono) {
        try {
          const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
          const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
          const mensajeNotificacion = `💈 ¡Nueva Cita Agendada!\n\n📅 Fecha: ${date_string} a las ${time_string}\n🧑‍🦱 Cliente: ${client_name}\n✂️ Servicio: ${service_name}\n✅ Revisa el panel web para ver el folio de pago y más detalles.`;
          if (META_ACCESS_TOKEN && PHONE_NUMBER_ID) {
            await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
              messaging_product: "whatsapp",
              to: barbero.telefono,
              type: "text",
              text: { body: mensajeNotificacion }
            }, { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } });
            console.log(`Notificación enviada al barbero ${barbero.nombre}`);
          }
        } catch (e) {
          console.error("Error al enviar notificación al barbero:", e.response?.data || e.message);
        }
      }
      const folio = `ISA-${String(cita_id).padStart(4, '0')}`;
      return { success: true, cita_id, folio, mensaje: `Cita agendada exitosamente. El folio de reserva es: ${folio}.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  cancel_or_reschedule: async ({ cita_id, action, new_date, new_time, new_barbero_id, new_service_name }) => {
    try {
      const { rows: citaRows } = await db.query(
        "SELECT * FROM citas WHERE id = $1",
        [cita_id]
      );
      if (citaRows.length === 0) {
        return { success: false, error: "No encontré ninguna cita con ese folio. Verifica que el número sea correcto." };
      }
      const cita = citaRows[0];
      if (cita.status === 'cancelada' && action === 'cancelar') {
        return { success: false, error: "Esta cita ya fue cancelada anteriormente." };
      }
      if (cita.status === 'completada') {
        return { success: false, error: "Esta cita ya fue completada y no puede modificarse." };
      }

      if (action === 'cancelar') {
        await db.query("UPDATE citas SET status = 'cancelada' WHERE id = $1", [cita_id]);
        return { success: true, mensaje: `Cita ISA-${String(cita_id).padStart(4,'0')} cancelada correctamente. El dinero queda protegido en este folio.` };
      }

      if (action === 'reprogramar') {
        if (cita.reprogramaciones >= 2) {
          return { success: false, error: "Esta cita ya alcanzó el límite máximo de reprogramaciones (2). El cliente debe agendar una nueva cita pagando un nuevo anticipo." };
        }
        if (!new_date || !new_time) {
          return { success: false, error: "Necesito la nueva fecha y hora para reprogramar." };
        }
        const newFechaHora = `${new_date}T${new_time}`;
        const barberoFinal = new_barbero_id || cita.barbero_id;
        const servicioFinal = new_service_name || cita.servicio;
        const newReproCount = (cita.reprogramaciones || 0) + 1;
        await db.query(
          "UPDATE citas SET fecha_hora = $1, barbero_id = $2, servicio = $3, status = 'pendiente', reprogramaciones = $4 WHERE id = $5",
          [newFechaHora, barberoFinal, servicioFinal, newReproCount, cita_id]
        );

        // Notificar al barbero por WhatsApp
        const { rows: barberoRows } = await db.query("SELECT nombre, telefono FROM barberos WHERE id = $1", [barberoFinal]);
        const barbero = barberoRows[0];
        if (barbero && barbero.telefono) {
          try {
            const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
            const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
            const folioStr = `ISA-${String(cita_id).padStart(4,'0')}`;
            const mensajeNotificacion = `🔄 ¡Cita Reprogramada!\n\nEl folio ${folioStr} ha sido reprogramado.\n📅 Nueva Fecha: ${new_date} a las ${new_time}\n🧑‍🦱 Cliente: ${cita.cliente_nombre}\n✂️ Servicio: ${servicioFinal}\n✅ Revisa el panel web para más detalles.`;
            if (META_ACCESS_TOKEN && PHONE_NUMBER_ID) {
              await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
                messaging_product: "whatsapp",
                to: barbero.telefono,
                type: "text",
                text: { body: mensajeNotificacion }
              }, { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } });
              console.log(`Notificación de reprogramación enviada al barbero ${barbero.nombre}`);
            }
          } catch (e) {
            console.error("Error al enviar notificación de reprogramación al barbero:", e.response?.data || e.message);
          }
        }

        return { success: true, mensaje: `Cita ISA-${String(cita_id).padStart(4,'0')} reprogramada para ${new_date} a las ${new_time}. Quedan ${2 - newReproCount} reprogramaciones disponibles para este folio.` };
      }

      return { success: false, error: "Acción no reconocida. Usa 'cancelar' o 'reprogramar'." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

const userChats = {};
const bannedUsers = {};

async function processMessage(phone, messageText, imageData = null) {
  if (bannedUsers[phone] && bannedUsers[phone] > Date.now()) {
    console.log(`Mensaje ignorado, usuario ${phone} está baneado.`);
    return null;
  }

  if (!userChats[phone]) {
    userChats[phone] = [{ role: "system", content: SYSTEM_PROMPT }];
  }

  let userContent = messageText;
  if (imageData) {
    const base64Str = imageData.buffer.toString("base64");
    try {
      const visionModel = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
      const visionResult = await visionModel.generateContent([
        "El cliente ha enviado esta imagen. Si la imagen NO es un comprobante de pago y es algo totalmente irrelevante (memes, fotos personales, ofensivas, etc.), responde ÚNICAMENTE con: '[IMAGEN_IRRELEVANTE_O_INAPROPIADA]'. Si SÍ parece un comprobante, extrae en texto claro la fecha en la que se realizó la transferencia, la hora exacta, el monto total, y el folio o clave de rastreo. MUY IMPORTANTE: Si es un comprobante pero NO muestra claramente la fecha y hora, debes incluir obligatoriamente el texto '[NO_FECHA_HORA_VISIBLE]'. No inventes ni deduzcas datos.",
        {
          inlineData: {
            data: base64Str,
            mimeType: imageData.mimeType
          }
        }
      ]);
      const extractedText = visionResult.response.text();
      userContent = `[IMAGEN ENVIADA POR EL CLIENTE]\nHe adjuntado una captura de pantalla. Los datos extraídos de la imagen son:\n${extractedText}`;
    } catch(err) {
      console.error("Error en Gemini Vision:", err);
      userContent = "[IMAGEN ENVIADA POR EL CLIENTE]\nSe envió una captura pero hubo un error al leerla visualmente.";
    }
  }

  userChats[phone].push({ role: "user", content: userContent });

  try {
    let response = await openai.chat.completions.create({
      model: "deepseek-v4-flash", 
      messages: userChats[phone],
      tools: tools
    });

    let responseMessage = response.choices[0].message;
    userChats[phone].push(responseMessage);

    let iterations = 0;
    while (responseMessage.tool_calls && iterations < 5) {
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        args.client_phone = phone;

        const func = toolFunctions[functionName];
        let fnResult = {};
        if (func) {
          fnResult = await func(args);
        } else {
          fnResult = { error: "Herramienta no encontrada" };
        }

        userChats[phone].push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(fnResult)
        });
      }

      response = await openai.chat.completions.create({
        model: "deepseek-v4-flash",
        messages: userChats[phone],
        tools: tools
      });

      responseMessage = response.choices[0].message;
      userChats[phone].push(responseMessage);
      iterations++;
    }

    let finalResponse = responseMessage.content;
    if (finalResponse && finalResponse.includes('[BANEADO_X_MINUTOS]')) {
      const banTime = 30 * 60 * 1000;
      bannedUsers[phone] = Date.now() + banTime;
      return "Has sido silenciado temporalmente (30 minutos) por uso inadecuado del asistente virtual.";
    }

    return finalResponse;
  } catch (err) {
    console.error("Error processMessage con DeepSeek:", err.response?.data || err.message);
    return "Lo siento, tuve un problema técnico. ¿Puedes repetirlo?";
  }
}

module.exports = { processMessage };
