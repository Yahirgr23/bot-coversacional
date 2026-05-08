import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LogOut, Calendar, Clock, Scissors, 
  CheckCircle2, XCircle, Phone, User as UserIcon, 
  Activity, CalendarCheck, Inbox 
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000/api`;

const STATUS_CONFIG = {
  pendiente: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    icon: <Clock className="w-4 h-4" />
  },
  completada: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  cancelada: {
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    icon: <XCircle className="w-4 h-4" />
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [tab, setTab] = useState('hoy');
  const [loading, setLoading] = useState(true);
  
  const userString = localStorage.getItem('isa_user');
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      fetchCitas();
    }
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('isa_user');
    navigate('/login');
  }

  async function fetchCitas() {
    setLoading(true);
    try {
      const params = {};
      if (user && user.rol === 'barbero') {
        params.barbero_id = user.barbero_id;
      }
      const res = await axios.get(`${API_URL}/citas`, { params });
      setCitas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await axios.patch(`${API_URL}/citas/${id}/status`, { status });
      fetchCitas();
    } catch (err) {
      console.error("Error updating status", err);
    }
  }

  const citasFiltradas = citas.filter(cita => {
    if (tab === 'hoy') return isToday(parseISO(cita.fecha_hora));
    return true;
  });

  // Estadísticas
  const totalCitas = citasFiltradas.length;
  const completadas = citasFiltradas.filter(c => c.status === 'completada').length;
  const pendientes = citasFiltradas.filter(c => c.status === 'pendiente').length;

  return (
    <div className="min-h-screen bg-barber-dark text-white pb-24 relative selection:bg-barber-gold/30">
      {/* Fondo ambiental */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-barber-gold/5 to-transparent pointer-events-none"></div>

        {/* Header App */}
        <header className="flex items-center justify-between p-5 sticky top-0 bg-barber-dark/80 backdrop-blur-xl z-50 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-barber-gold/10 p-2.5 rounded-xl border border-barber-gold/20">
              <Scissors className="w-6 h-6 text-barber-gold" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-white leading-none">
                {user?.rol === 'admin' ? 'PANEL ADMIN' : 'MI AGENDA'}
              </h1>
              <p className="text-xs font-semibold tracking-widest text-barber-gold uppercase mt-1">
                {user?.rol === 'admin' ? 'Vista Global' : `Barbero: ${user?.usuario}`}
              </p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="p-2.5 bg-zinc-800/50 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 shadow-sm">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6 mt-4 relative z-10">
        
        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-barber-gray/80 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Total</span>
              <Calendar className="w-4 h-4 text-barber-gold opacity-80" />
            </div>
            <div className="mt-2 text-3xl font-black text-white">{totalCitas}</div>
          </div>
          <div className="bg-emerald-950/20 backdrop-blur-sm border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-emerald-400/80 text-xs font-semibold uppercase tracking-wider">Listas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-80" />
            </div>
            <div className="mt-2 text-3xl font-black text-emerald-400">{completadas}</div>
          </div>
          <div className="bg-amber-950/20 backdrop-blur-sm border border-amber-500/10 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start">
              <span className="text-amber-400/80 text-xs font-semibold uppercase tracking-wider">Pend.</span>
              <Clock className="w-4 h-4 text-amber-400 opacity-80" />
            </div>
            <div className="mt-2 text-3xl font-black text-amber-400">{pendientes}</div>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/5 shadow-inner">
          {['hoy', 'todas'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all capitalize
                ${tab === t 
                  ? 'bg-gradient-to-r from-barber-gold to-yellow-500 text-barber-dark shadow-md' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            >
              {t === 'hoy' ? <Activity size={16} /> : <CalendarCheck size={16} />}
              {t === 'hoy' ? 'Solo Hoy' : 'Historial Completo'}
            </button>
          ))}
        </div>

        {/* Lista de citas */}
        {loading ? (
          <div className="text-center py-24 text-zinc-500 flex flex-col items-center">
             <div className="w-16 h-16 border-4 border-zinc-800 border-t-barber-gold rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(212,175,55,0.2)]"></div>
             <p className="font-medium animate-pulse text-zinc-400">Buscando citas en la agenda...</p>
          </div>
        ) : citasFiltradas.length === 0 ? (
          <div className="text-center py-24 bg-barber-gray/30 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center">
            <div className="bg-zinc-900/50 p-4 rounded-full mb-4">
              <Inbox className="w-10 h-10 text-zinc-600" />
            </div>
            <p className="font-bold text-lg text-zinc-300">{tab === 'hoy' ? 'Agenda libre para hoy' : 'Aún no hay citas'}</p>
            <p className="text-sm mt-1 text-zinc-500 max-w-xs">Las citas que asigne el asistente por WhatsApp aparecerán mágicamente aquí.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {citasFiltradas.map(cita => {
              const conf = STATUS_CONFIG[cita.status];
              
              return (
                <div key={cita.id} className="bg-barber-gray/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-xl hover:border-barber-gold/30 hover:bg-barber-gray transition-all group">
                  {/* Encabezado de la Cita */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-5 h-5 text-barber-gold" />
                        <h2 className="font-extrabold text-white text-lg truncate tracking-tight">{cita.cliente_nombre}</h2>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 text-sm ml-7">
                        <Phone className="w-3.5 h-3.5" />
                        <a href={'tel:' + cita.cliente_telefono} className="hover:text-barber-gold transition-colors font-medium">
                          {cita.cliente_telefono}
                        </a>
                      </div>
                    </div>
                    
                    {/* Badge Estado */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${conf.bg} ${conf.border} ${conf.color}`}>
                      {conf.icon}
                      <span>{cita.status}</span>
                    </div>
                  </div>
                  
                  {/* Detalles Info */}
                  <div className="ml-7 bg-zinc-900/80 rounded-xl p-3 mb-5 space-y-2.5 border border-white/5 group-hover:border-white/10 transition-colors">
                     <div className="flex items-center gap-3 text-sm">
                       <div className="bg-white/5 p-1.5 rounded-md text-zinc-400">
                         <Calendar className="w-4 h-4" />
                       </div>
                       <span className="font-medium text-white capitalize">
                         {format(parseISO(cita.fecha_hora), "EEEE d MMM · h:mm a", { locale: es })}
                       </span>
                     </div>
                     <div className="flex items-center gap-3 text-sm">
                       <div className="bg-barber-gold/10 p-1.5 rounded-md text-barber-gold">
                         <Scissors className="w-4 h-4" />
                       </div>
                       <div className="flex flex-wrap items-center gap-x-2">
                         <span className="font-bold text-barber-gold">{cita.servicio}</span>
                         <span className="text-zinc-600 px-1">•</span>
                         <span className="text-zinc-400 flex items-center gap-1">
                           <UserIcon className="w-3.5 h-3.5 opacity-50" />
                           {cita.barbero || 'Cualquiera'}
                         </span>
                       </div>
                     </div>
                     
                     {/* Validación de Anticipo */}
                     {cita.anticipo_pagado ? (
                       <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-2.5 mt-1">
                         <div className="bg-emerald-500/10 p-1.5 rounded-md text-emerald-400">
                           <CheckCircle2 className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Anticipo: ${cita.anticipo_pagado}</span>
                           <span className="text-zinc-500 text-[10px] font-mono mt-0.5">Folio: {cita.comprobante_id}</span>
                         </div>
                       </div>
                     ) : null}
                  </div>

                  {/* Botones de Acción */}
                  {cita.status === 'pendiente' && (
                    <div className="ml-7 flex gap-3">
                      <button
                        onClick={() => updateStatus(cita.id, 'completada')}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm rounded-xl py-3 transition-all border border-emerald-500/20 hover:border-emerald-500/40"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Completar
                      </button>
                      <button
                        onClick={() => updateStatus(cita.id, 'cancelada')}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl py-3 transition-all border border-red-500/20 hover:border-red-500/40"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
