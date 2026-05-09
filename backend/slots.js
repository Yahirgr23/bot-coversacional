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
  const targetDate = new Date(dateString + 'T00:00:00');
  const hours = getBusinessHours(targetDate);

  const barberos = await getBarberos();
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
      if (preferredBarbero) {
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
      } else {
        availableSlots.push({ hora: timeStr, barbero: "Cualquier barbero disponible", barbero_id: freeBarberos[0].id });
      }
    }
  }

  return availableSlots;
}

module.exports = { getAvailableSlots, getBarberos };
