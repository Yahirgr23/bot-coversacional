const db = require('./database'); // db es ahora un Pool de pg

function getBusinessHours(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday
  if (day === 0) {
    return { start: 10, end: 18 };
  } else {
    return { start: 9, end: 20 };
  }
}

async function getBarberos() {
  const { rows } = await db.query("SELECT * FROM barberos WHERE activo = 1");
  return rows;
}

async function getCitasPorFecha(fechaYMD) {
  const likeStr = `${fechaYMD}%`;
  const { rows } = await db.query(
    "SELECT * FROM citas WHERE status = 'pendiente' AND fecha_hora LIKE $1",
    [likeStr]
  );
  return rows;
}

async function getAvailableSlots(dateString, preferredBarbero = null) {
  // ── 1. Verificar si el negocio está cerrado ese día ──────────────────────
  const { rows: cerradoRows } = await db.query(
    "SELECT motivo FROM dias_cerrados WHERE fecha = $1::DATE",
    [dateString]
  );
  if (cerradoRows.length > 0) {
    const motivo = cerradoRows[0].motivo || 'sin motivo especificado';
    return { negocio_cerrado: true, motivo };
  }

  const targetDate = new Date(dateString + 'T00:00:00');
  const hours = getBusinessHours(targetDate);
  let barberos = await getBarberos();

  // ── 2. Verificar ausencias del barbero preferido ese día ──────────────────
  let barberoAusenteAviso = null;
  if (preferredBarbero) {
    const barberoObj = barberos.find(b =>
      b.nombre.toLowerCase().includes(preferredBarbero.toLowerCase())
    );
    if (barberoObj) {
      const { rows: ausenciaRows } = await db.query(
        "SELECT motivo FROM ausencias_barbero WHERE barbero_id = $1 AND fecha = $2::DATE",
        [barberoObj.id, dateString]
      );
      if (ausenciaRows.length > 0) {
        const motivoAusencia = ausenciaRows[0].motivo || 'motivo personal';
        barberoAusenteAviso = {
          barbero_nombre: barberoObj.nombre,
          motivo: motivoAusencia
        };
        // Excluimos al barbero ausente de la búsqueda de slots
        barberos = barberos.filter(b => b.id !== barberoObj.id);
      }
    }
  } else {
    // Si no hay preferencia, igual filtramos barberos con ausencia ese día
    const { rows: ausenciasDelDia } = await db.query(
      "SELECT barbero_id FROM ausencias_barbero WHERE fecha = $1::DATE",
      [dateString]
    );
    const idsBarberosAusentes = ausenciasDelDia.map(r => r.barbero_id);
    barberos = barberos.filter(b => !idsBarberosAusentes.includes(b.id));
  }

  const citas = await getCitasPorFecha(dateString);
  const availableSlots = [];

  for (let h = hours.start; h < hours.end; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    const slotDateTime = `${dateString}T${timeStr}:00`;

    const freeBarberos = barberos.filter(b => {
      const hasCita = citas.some(c => {
        if (c.barbero_id !== b.id) return false;
        const citaStart = new Date(c.fecha_hora);
        const duracion = c.duracion_total || 60;
        const citaEnd = new Date(citaStart.getTime() + duracion * 60000);
        const slotStart = new Date(slotDateTime);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60000);
        return (slotStart < citaEnd && slotEnd > citaStart);
      });
      return !hasCita;
    });

    if (freeBarberos.length > 0) {
      if (preferredBarbero && !barberoAusenteAviso) {
        const preferredIsFree = freeBarberos.find(b =>
          b.nombre.toLowerCase().includes(preferredBarbero.toLowerCase())
        );
        if (preferredIsFree) {
          availableSlots.push({ hora: timeStr, barbero: preferredIsFree.nombre, barbero_id: preferredIsFree.id });
        } else {
          freeBarberos.forEach(fb => {
            availableSlots.push({ hora: timeStr, barbero: fb.nombre, barbero_id: fb.id, alternativa: true });
          });
        }
      } else if (preferredBarbero && barberoAusenteAviso) {
        // El barbero pedido está ausente: mostramos alternativas
        freeBarberos.forEach(fb => {
          availableSlots.push({ hora: timeStr, barbero: fb.nombre, barbero_id: fb.id, alternativa: true });
        });
      } else {
        availableSlots.push({ hora: timeStr, barbero: "Cualquier barbero disponible", barbero_id: freeBarberos[0].id });
      }
    }
  }

  // ── 3. Retornar resultado incluyendo aviso de ausencia si aplica ──────────
  if (barberoAusenteAviso) {
    return {
      barbero_ausente: barberoAusenteAviso,
      alternativas: availableSlots
    };
  }

  return availableSlots;
}

module.exports = { getAvailableSlots, getBarberos };
