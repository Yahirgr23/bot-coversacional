const db = require('./database');

function getBusinessHours(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1-6 = Mon-Sat
  if (day === 0) {
    return { start: 10, end: 18 }; // 10 AM to 6 PM
  } else {
    return { start: 9, end: 20 };  // 9 AM to 8 PM
  }
}

// Devuelve una promesa con los barberos
function getBarberos() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM barberos WHERE activo = 1", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Devuelve una promesa con citas de una fecha
function getCitasPorFecha(fechaYMD) {
  return new Promise((resolve, reject) => {
    // fechaYMD format: YYYY-MM-DD
    const likeStr = `${fechaYMD}%`;
    db.all("SELECT * FROM citas WHERE status = 'pendiente' AND fecha_hora LIKE ?", [likeStr], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function getAvailableSlots(dateString, preferredBarbero = null) {
  // dateString is expected to be YYYY-MM-DD
  const targetDate = new Date(dateString + 'T00:00:00');
  const hours = getBusinessHours(targetDate);
  
  const barberos = await getBarberos();
  const citas = await getCitasPorFecha(dateString);

  const availableSlots = [];

  // Generate 1-hour slots
  for (let h = hours.start; h < hours.end; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    const slotDateTime = `${dateString}T${timeStr}:00`;
    
    // Check which barbers are free
    const freeBarberos = barberos.filter(b => {
      // Check if this barber has an appointment overlapping this exact slot
      const hasCita = citas.some(c => {
        if (c.barbero_id !== b.id) return false;
        
        const citaStart = new Date(c.fecha_hora);
        const duracion = c.duracion_total || 60; // fallback to 60 if null
        const citaEnd = new Date(citaStart.getTime() + duracion * 60000);
        
        // El slot que estamos checando (ej. 3:00 PM a 4:00 PM)
        const slotStart = new Date(slotDateTime);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60000); // slot de 1 hora
        
        // Hay overlap si el slot empieza antes de que termine la cita Y termina después de que empieza
        return (slotStart < citaEnd && slotEnd > citaStart);
      });
      return !hasCita;
    });

    if (freeBarberos.length > 0) {
      if (preferredBarbero) {
        const preferredIsFree = freeBarberos.find(b => b.nombre.toLowerCase().includes(preferredBarbero.toLowerCase()));
        if (preferredIsFree) {
          availableSlots.push({ hora: timeStr, barbero: preferredIsFree.nombre, barbero_id: preferredIsFree.id });
        } else {
          // Add all free to recommend alternatives
          freeBarberos.forEach(fb => {
             availableSlots.push({ hora: timeStr, barbero: fb.nombre, barbero_id: fb.id, alternativa: true });
          });
        }
      } else {
        // Just push the first available barber or indicate "Cualquiera"
        availableSlots.push({ hora: timeStr, barbero: "Cualquier barbero disponible", barbero_id: freeBarberos[0].id });
      }
    }
  }

  return availableSlots;
}

module.exports = { getAvailableSlots, getBarberos };
