import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LogOut, Calendar, Clock, Scissors, 
  CheckCircle2, XCircle, Phone, User as UserIcon, 
  Activity, CalendarCheck, Inbox, Users, Edit2, Trash2, Plus, 
  DollarSign, Contact, CalendarX2, CalendarOff, AlertTriangle
} from 'lucide-react';

const BASE_URL = 'https://bot-coversacional-production.up.railway.app';
const API_URL = `${BASE_URL}/api`;

const STATUS_CONFIG = {
  pendiente: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: <Clock className="w-4 h-4" /> },
  completada: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelada: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: <XCircle className="w-4 h-4" /> },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [tab, setTab] = useState('hoy');
  const [loading, setLoading] = useState(true);
  
  // Admin Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('usuarios'); // usuarios, barberos, servicios, configuracion, calendario
  const [config, setConfig] = useState({ clabe: '', nombre_titular: '' });

  const [usuarios, setUsuarios] = useState([]);
  const [userFormData, setUserFormData] = useState({ id: null, usuario: '', password: '', rol: 'barbero', barbero_id: '' });

  const [barberos, setBarberos] = useState([]);
  const [barberoFormData, setBarberoFormData] = useState({ id: null, nombre: '', telefono: '' });

  const [servicios, setServicios] = useState([]);
  const [servicioFormData, setServicioFormData] = useState({ id: null, nombre: '', precio: '', duracion_min: '', tipo_precio: 'fijo' });

  // Ausencias y Días Cerrados
  const [ausencias, setAusencias] = useState([]);
  const [ausenciaForm, setAusenciaForm] = useState({ fecha: '', motivo: '' });
  const [diasCerrados, setDiasCerrados] = useState([]);
  const [diaCerradoForm, setDiaCerradoForm] = useState({ fecha: '', motivo: '' });
  const [showAusenciasPanel, setShowAusenciasPanel] = useState(false);

  const userString = localStorage.getItem('isa_user');
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    if (!user) navigate('/login');
    else {
      fetchCitas();
      if (user.rol === 'barbero' && user.barbero_id) {
        fetchAusencias(user.barbero_id);
      }
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
      if (user && user.rol === 'barbero') params.barbero_id = user.barbero_id;
      const res = await axios.get(`${API_URL}/citas`, { params });
      setCitas(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }

  async function updateStatus(id, status) {
    try {
      await axios.patch(`${API_URL}/citas/${id}/status`, { status });
      fetchCitas();
    } catch (err) { console.error("Error updating status", err); }
  }

  // --- ADMIN METHODS ---
  async function openAdminModal() {
    setIsModalOpen(true);
    fetchAllData();
  }

  async function fetchAllData() {
    fetchUsuarios();
    fetchBarberos();
    fetchServicios();
    fetchConfig();
    fetchDiasCerrados();
    fetchAusencias();
  }

  async function fetchConfig() {
    try { const res = await axios.get(`${API_URL}/config`); setConfig(res.data); } catch (err) { console.error(err); }
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/config`, config);
      alert("Configuración guardada exitosamente");
    } catch (err) { alert("Error al guardar configuración"); }
  }

  async function fetchUsuarios() {
    try { const res = await axios.get(`${API_URL}/usuarios`); setUsuarios(res.data); } catch (err) { console.error(err); }
  }
  async function fetchBarberos() {
    try { const res = await axios.get(`${API_URL}/barberos`); setBarberos(res.data); } catch (err) { console.error(err); }
  }
  async function fetchServicios() {
    try { const res = await axios.get(`${API_URL}/servicios`); setServicios(res.data); } catch (err) { console.error(err); }
  }

  // Ausencias
  async function fetchAusencias(bId) {
    try {
      const params = bId ? { barbero_id: bId } : {};
      const res = await axios.get(`${API_URL}/ausencias`, { params });
      setAusencias(res.data);
    } catch (err) { console.error(err); }
  }
  async function handleSaveAusencia(e) {
    e.preventDefault();
    const barberoId = user.rol === 'barbero' ? user.barbero_id : null;
    if (!barberoId) return alert('Este usuario no está vinculado a un barbero');
    try {
      await axios.post(`${API_URL}/ausencias`, { barbero_id: barberoId, fecha: ausenciaForm.fecha, motivo: ausenciaForm.motivo });
      setAusenciaForm({ fecha: '', motivo: '' });
      fetchAusencias(barberoId);
    } catch (err) { alert('Error al guardar ausencia'); }
  }
  async function handleDeleteAusencia(id) {
    if (!window.confirm('¿Eliminar esta ausencia?')) return;
    try {
      await axios.delete(`${API_URL}/ausencias/${id}`);
      const bId = user.rol === 'barbero' ? user.barbero_id : null;
      fetchAusencias(bId);
    } catch (err) { alert('Error al eliminar'); }
  }

  // Días Cerrados
  async function fetchDiasCerrados() {
    try { const res = await axios.get(`${API_URL}/dias-cerrados`); setDiasCerrados(res.data); } catch (err) { console.error(err); }
  }
  async function handleSaveDiaCerrado(e) {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/dias-cerrados`, { fecha: diaCerradoForm.fecha, motivo: diaCerradoForm.motivo });
      setDiaCerradoForm({ fecha: '', motivo: '' });
      fetchDiasCerrados();
    } catch (err) { alert('Error al guardar día cerrado'); }
  }
  async function handleDeleteDiaCerrado(id) {
    if (!window.confirm('¿Eliminar este día cerrado?')) return;
    try { await axios.delete(`${API_URL}/dias-cerrados/${id}`); fetchDiasCerrados(); } catch (err) { alert('Error al eliminar'); }
  }

  // CRUD Usuarios
  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      const payload = { ...userFormData };
      if (!payload.barbero_id) payload.barbero_id = null;
      if (userFormData.id) await axios.put(`${API_URL}/usuarios/${userFormData.id}`, payload);
      else await axios.post(`${API_URL}/usuarios`, payload);
      setUserFormData({ id: null, usuario: '', password: '', rol: 'barbero', barbero_id: '' });
      fetchUsuarios();
    } catch (err) { alert("Error al guardar usuario"); }
  }
  async function handleDeleteUser(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try { await axios.delete(`${API_URL}/usuarios/${id}`); fetchUsuarios(); } catch (err) { alert("Error al eliminar"); }
  }

  // CRUD Barberos
  async function handleSaveBarbero(e) {
    e.preventDefault();
    try {
      if (barberoFormData.id) await axios.put(`${API_URL}/barberos/${barberoFormData.id}`, barberoFormData);
      else await axios.post(`${API_URL}/barberos`, barberoFormData);
      setBarberoFormData({ id: null, nombre: '', telefono: '' });
      fetchAllData(); // Refresh all as users depend on barbers
    } catch (err) { alert("Error al guardar barbero"); }
  }
  async function handleDeleteBarbero(id) {
    if (!window.confirm("Borrar un barbero puede afectar citas antiguas. ¿Seguro?")) return;
    try { await axios.delete(`${API_URL}/barberos/${id}`); fetchAllData(); } catch (err) { alert("Error al eliminar (puede que esté ligado a citas)"); }
  }

  // CRUD Servicios
  async function handleSaveServicio(e) {
    e.preventDefault();
    try {
      if (servicioFormData.id) await axios.put(`${API_URL}/servicios/${servicioFormData.id}`, servicioFormData);
      else await axios.post(`${API_URL}/servicios`, servicioFormData);
      setServicioFormData({ id: null, nombre: '', precio: '', duracion_min: '', tipo_precio: 'fijo' });
      fetchServicios();
    } catch (err) { alert("Error al guardar servicio"); }
  }
  async function handleDeleteServicio(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este servicio?")) return;
    try { await axios.delete(`${API_URL}/servicios/${id}`); fetchServicios(); } catch (err) { alert("Error al eliminar"); }
  }

  const citasFiltradas = citas.filter(cita => {
    if (tab === 'hoy') return isToday(parseISO(cita.fecha_hora));
    return true;
  });

  return (
    <div className="min-h-screen bg-barber-dark text-white pb-24 relative selection:bg-barber-gold/30">
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-barber-gold/5 to-transparent pointer-events-none"></div>

      {/* HEADER */}
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
        
        <div className="flex gap-2">
          {user?.rol === 'admin' && (
            <button onClick={openAdminModal} className="p-2.5 bg-zinc-800/50 text-barber-gold hover:text-white hover:bg-barber-gold/20 rounded-xl transition-all border border-transparent hover:border-barber-gold/30 shadow-sm" title="Panel de Configuración">
              <Users className="w-5 h-5" />
            </button>
          )}
          {user?.rol === 'barbero' && (
            <button onClick={() => setShowAusenciasPanel(v => !v)} className={`p-2.5 rounded-xl transition-all border shadow-sm ${showAusenciasPanel ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-zinc-800/50 text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 border-transparent hover:border-orange-500/20'}`} title="Mis Ausencias">
              <CalendarOff className="w-5 h-5" />
            </button>
          )}
          <button onClick={handleLogout} className="p-2.5 bg-zinc-800/50 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20 shadow-sm" title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PANEL AUSENCIAS (solo barbero) */}
      {user?.rol === 'barbero' && showAusenciasPanel && (
        <div className="max-w-3xl mx-auto px-4 pt-4 relative z-10">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-orange-500/10 p-2 rounded-lg">
                <CalendarOff className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Mis Días de Ausencia</h2>
                <p className="text-xs text-zinc-500">El bot avisará a los clientes que no estarás disponible en estas fechas</p>
              </div>
            </div>

            <form onSubmit={handleSaveAusencia} className="flex flex-col sm:flex-row gap-3">
              <input
                required
                type="date"
                className="bg-black/40 border border-white/5 text-white rounded-lg px-3 py-2.5 text-sm flex-1 focus:outline-none focus:border-orange-500/40"
                value={ausenciaForm.fecha}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setAusenciaForm({ ...ausenciaForm, fecha: e.target.value })}
              />
              <input
                type="text"
                placeholder="Motivo (opcional)"
                className="bg-black/40 border border-white/5 text-white rounded-lg px-3 py-2.5 text-sm flex-1 focus:outline-none focus:border-orange-500/40"
                value={ausenciaForm.motivo}
                onChange={e => setAusenciaForm({ ...ausenciaForm, motivo: e.target.value })}
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Registrar
              </button>
            </form>

            {ausencias.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-3">No tienes ausencias registradas</p>
            ) : (
              <div className="space-y-2">
                {ausencias.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 border border-white/5">
                    <div className="flex items-center gap-3">
                      <CalendarX2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-white">{new Date(String(a.fecha).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        {a.motivo && <p className="text-xs text-zinc-500 mt-0.5">{a.motivo}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAusencia(a.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      <main className="max-w-3xl mx-auto p-4 space-y-6 mt-4 relative z-10">
        <div className="flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/5 shadow-inner">
          {['hoy', 'todas'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all capitalize
                ${tab === t ? 'bg-gradient-to-r from-barber-gold to-yellow-500 text-barber-dark shadow-md' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
              {t === 'hoy' ? <Activity size={16} /> : <CalendarCheck size={16} />}
              {t === 'hoy' ? 'Solo Hoy' : 'Historial Completo'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24 text-zinc-500 flex flex-col items-center">
             <div className="w-16 h-16 border-4 border-zinc-800 border-t-barber-gold rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(212,175,55,0.2)]"></div>
             <p className="font-medium animate-pulse text-zinc-400">Buscando citas...</p>
          </div>
        ) : citasFiltradas.length === 0 ? (
          <div className="text-center py-24 bg-barber-gray/30 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center">
            <div className="bg-zinc-900/50 p-4 rounded-full mb-4">
              <Inbox className="w-10 h-10 text-zinc-600" />
            </div>
            <p className="font-bold text-lg text-zinc-300">{tab === 'hoy' ? 'Agenda libre para hoy' : 'Aún no hay citas'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {citasFiltradas.map(cita => {
              const conf = STATUS_CONFIG[cita.status];
              return (
                <div key={cita.id} className="bg-barber-gray/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 shadow-xl hover:border-barber-gold/30 hover:bg-barber-gray transition-all group">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="w-5 h-5 text-barber-gold" />
                        <h2 className="font-extrabold text-white text-lg truncate tracking-tight">{cita.cliente_nombre}</h2>
                        <span className="ml-2 text-[10px] font-mono bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full border border-barber-gold/30 uppercase tracking-wider">
                          Folio: ISA-{String(cita.id).padStart(4, '0')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 text-sm ml-7">
                        <Phone className="w-3.5 h-3.5" />
                        <a href={'tel:' + cita.cliente_telefono} className="hover:text-barber-gold transition-colors font-medium">
                          {cita.cliente_telefono}
                        </a>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${conf.bg} ${conf.border} ${conf.color}`}>
                      {conf.icon}
                      <span>{cita.status}</span>
                    </div>
                  </div>
                  
                  <div className="ml-7 bg-zinc-900/80 rounded-xl p-3 mb-5 space-y-2.5 border border-white/5 group-hover:border-white/10 transition-colors">
                     <div className="flex items-center gap-3 text-sm">
                       <div className="bg-white/5 p-1.5 rounded-md text-zinc-400"><Calendar className="w-4 h-4" /></div>
                       <span className="font-medium text-white capitalize">{format(parseISO(cita.fecha_hora), "EEEE d MMM · h:mm a", { locale: es })}</span>
                     </div>
                     <div className="flex items-center gap-3 text-sm">
                       <div className="bg-barber-gold/10 p-1.5 rounded-md text-barber-gold"><Scissors className="w-4 h-4" /></div>
                       <div className="flex flex-wrap items-center gap-x-2">
                         <span className="font-bold text-barber-gold">{cita.servicio}</span>
                         <span className="text-zinc-600 px-1">•</span>
                         <span className="text-zinc-400 flex items-center gap-1">
                           <UserIcon className="w-3.5 h-3.5 opacity-50" />
                           {cita.barbero || 'Cualquiera'}
                         </span>
                       </div>
                     </div>
                     
                     {cita.anticipo_pagado ? (
                       <div className="flex items-center gap-3 text-sm border-t border-white/5 pt-2.5 mt-1">
                         <div className="bg-emerald-500/10 p-1.5 rounded-md text-emerald-400"><CheckCircle2 className="w-4 h-4" /></div>
                         <div className="flex flex-col flex-1">
                           <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider">Anticipo: ${cita.anticipo_pagado}</span>
                           <span className="text-zinc-500 text-[10px] font-mono mt-0.5">Folio: {cita.comprobante_id}</span>
                         </div>
                         {cita.comprobante_url && (
                           <a href={`${BASE_URL}${cita.comprobante_url}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs bg-barber-gold/10 text-barber-gold hover:bg-barber-gold/20 px-3 py-1.5 rounded-lg border border-barber-gold/20 flex items-center gap-1.5 font-bold transition-colors">
                             Ver Foto
                           </a>
                         )}
                       </div>
                     ) : null}
                  </div>

                  {cita.status === 'pendiente' && (
                    <div className="ml-7 flex gap-3">
                      <button onClick={() => updateStatus(cita.id, 'completada')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm rounded-xl py-3 border border-emerald-500/20"><CheckCircle2 className="w-4 h-4" /> Completar</button>
                      <button onClick={() => updateStatus(cita.id, 'cancelada')} className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl py-3 border border-red-500/20"><XCircle className="w-4 h-4" /> Cancelar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ADMIN PANEL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-barber-gold" />
                <h2 className="text-lg font-black text-white">Panel de Configuración</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto custom-scrollbar">
              <button onClick={() => setAdminTab('usuarios')} className={`flex-1 min-w-[110px] py-3 text-sm font-bold flex items-center justify-center gap-2 ${adminTab === 'usuarios' ? 'text-barber-gold border-b-2 border-barber-gold bg-white/5' : 'text-zinc-400 hover:text-white'}`}><UserIcon size={16}/> Usuarios</button>
              <button onClick={() => setAdminTab('barberos')} className={`flex-1 min-w-[110px] py-3 text-sm font-bold flex items-center justify-center gap-2 ${adminTab === 'barberos' ? 'text-barber-gold border-b-2 border-barber-gold bg-white/5' : 'text-zinc-400 hover:text-white'}`}><Contact size={16}/> Barberos</button>
              <button onClick={() => setAdminTab('servicios')} className={`flex-1 min-w-[110px] py-3 text-sm font-bold flex items-center justify-center gap-2 ${adminTab === 'servicios' ? 'text-barber-gold border-b-2 border-barber-gold bg-white/5' : 'text-zinc-400 hover:text-white'}`}><DollarSign size={16}/> Servicios</button>
              <button onClick={() => setAdminTab('configuracion')} className={`flex-1 min-w-[130px] py-3 text-sm font-bold flex items-center justify-center gap-2 ${adminTab === 'configuracion' ? 'text-barber-gold border-b-2 border-barber-gold bg-white/5' : 'text-zinc-400 hover:text-white'}`}><Activity size={16}/> Config</button>
              <button onClick={() => { setAdminTab('calendario'); fetchDiasCerrados(); fetchAusencias(); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold flex items-center justify-center gap-2 ${adminTab === 'calendario' ? 'text-orange-400 border-b-2 border-orange-400 bg-white/5' : 'text-zinc-400 hover:text-white'}`}><CalendarOff size={16}/> Calendario</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              
              {/* --- TAB USUARIOS --- */}
              {adminTab === 'usuarios' && (
                <>
                  <form onSubmit={handleSaveUser} className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-barber-gold uppercase tracking-wider">{userFormData.id ? 'Editar Usuario' : 'Nuevo Usuario Web'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required placeholder="Usuario" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={userFormData.usuario} onChange={e => setUserFormData({...userFormData, usuario: e.target.value})} />
                      <input required placeholder="Contraseña" type="text" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
                      <select className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={userFormData.rol} onChange={e => setUserFormData({...userFormData, rol: e.target.value})}>
                        <option value="admin">Administrador</option>
                        <option value="barbero">Barbero</option>
                      </select>
                      {userFormData.rol === 'barbero' && (
                        <select className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={userFormData.barbero_id} onChange={e => setUserFormData({...userFormData, barbero_id: e.target.value})}>
                          <option value="">Ligar a un Barbero...</option>
                          {barberos.map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-barber-gold text-black font-bold py-2.5 rounded-lg hover:bg-yellow-500 transition-colors">{userFormData.id ? 'Actualizar' : 'Crear'}</button>
                      {userFormData.id && <button type="button" onClick={() => setUserFormData({ id: null, usuario: '', password: '', rol: 'barbero', barbero_id: '' })} className="bg-zinc-700 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-zinc-600 transition-colors">Cancelar</button>}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {usuarios.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-zinc-800/30 p-4 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-white text-lg flex items-center gap-2">{u.usuario} <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{u.rol}</span></p>
                          <p className="text-sm text-zinc-400 font-mono mt-1">Pass: {u.password}</p>
                          {u.barbero_nombre && <p className="text-xs text-emerald-400/80 mt-1">Vinculado a: {u.barbero_nombre}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setUserFormData({id: u.id, usuario: u.usuario, password: u.password, rol: u.rol, barbero_id: u.barbero_id || ''})} className="p-2 bg-zinc-700/50 hover:bg-barber-gold/20 text-zinc-300 hover:text-barber-gold rounded-lg"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-zinc-700/50 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* --- TAB BARBEROS --- */}
              {adminTab === 'barberos' && (
                <>
                  <form onSubmit={handleSaveBarbero} className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-barber-gold uppercase tracking-wider">{barberoFormData.id ? 'Editar Barbero' : 'Nuevo Barbero'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required placeholder="Nombre Completo" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={barberoFormData.nombre} onChange={e => setBarberoFormData({...barberoFormData, nombre: e.target.value})} />
                      <input required placeholder="Teléfono (Ej. 521229...)" type="text" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={barberoFormData.telefono} onChange={e => setBarberoFormData({...barberoFormData, telefono: e.target.value})} />
                    </div>
                    <p className="text-xs text-zinc-500">Nota: El teléfono debe empezar con 521 para México para que Meta WhatsApp funcione.</p>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-barber-gold text-black font-bold py-2.5 rounded-lg hover:bg-yellow-500 transition-colors">{barberoFormData.id ? 'Actualizar' : 'Crear'}</button>
                      {barberoFormData.id && <button type="button" onClick={() => setBarberoFormData({ id: null, nombre: '', telefono: '' })} className="bg-zinc-700 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-zinc-600 transition-colors">Cancelar</button>}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {barberos.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-zinc-800/30 p-4 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-white text-lg">{b.nombre}</p>
                          <p className="text-sm text-zinc-400 font-mono mt-1">Tel: {b.telefono}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setBarberoFormData({id: b.id, nombre: b.nombre, telefono: b.telefono})} className="p-2 bg-zinc-700/50 hover:bg-barber-gold/20 text-zinc-300 hover:text-barber-gold rounded-lg"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteBarbero(b.id)} className="p-2 bg-zinc-700/50 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* --- TAB SERVICIOS --- */}
              {adminTab === 'servicios' && (
                <>
                  <form onSubmit={handleSaveServicio} className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-bold text-barber-gold uppercase tracking-wider">{servicioFormData.id ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input required placeholder="Nombre (Ej. Corte Clásico)" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={servicioFormData.nombre} onChange={e => setServicioFormData({...servicioFormData, nombre: e.target.value})} />
                      <input required placeholder="Precio ($)" type="number" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={servicioFormData.precio} onChange={e => setServicioFormData({...servicioFormData, precio: e.target.value})} />
                      <input required placeholder="Duración (minutos)" type="number" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={servicioFormData.duracion_min} onChange={e => setServicioFormData({...servicioFormData, duracion_min: e.target.value})} />
                      <select className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={servicioFormData.tipo_precio} onChange={e => setServicioFormData({...servicioFormData, tipo_precio: e.target.value})}>
                        <option value="fijo">Precio Fijo</option>
                        <option value="desde">Precio Variable (Desde $X)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-barber-gold text-black font-bold py-2.5 rounded-lg hover:bg-yellow-500 transition-colors">{servicioFormData.id ? 'Actualizar' : 'Crear'}</button>
                      {servicioFormData.id && <button type="button" onClick={() => setServicioFormData({ id: null, nombre: '', precio: '', duracion_min: '', tipo_precio: 'fijo' })} className="bg-zinc-700 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-zinc-600 transition-colors">Cancelar</button>}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {servicios.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-zinc-800/30 p-4 rounded-xl border border-white/5">
                        <div>
                          <p className="font-bold text-white text-lg flex items-center gap-2">
                            {s.nombre}
                            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${s.tipo_precio === 'desde' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {s.tipo_precio === 'desde' ? 'Variable' : 'Fijo'}
                            </span>
                          </p>
                          <p className="text-sm text-zinc-400 mt-1">
                            {s.tipo_precio === 'desde' ? 'Desde ' : ''}<span className="text-barber-gold font-bold">${s.precio}</span> • {s.duracion_min} mins
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setServicioFormData({id: s.id, nombre: s.nombre, precio: s.precio, duracion_min: s.duracion_min, tipo_precio: s.tipo_precio})} className="p-2 bg-zinc-700/50 hover:bg-barber-gold/20 text-zinc-300 hover:text-barber-gold rounded-lg"><Edit2 size={18} /></button>
                          <button onClick={() => handleDeleteServicio(s.id)} className="p-2 bg-zinc-700/50 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 rounded-lg"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* --- TAB CONFIGURACION --- */}
              {adminTab === 'configuracion' && (
                <form onSubmit={handleSaveConfig} className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-barber-gold uppercase tracking-wider">Datos Bancarios para el Bot</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Nombre del Titular de la Cuenta</label>
                      <input required placeholder="Ej. ISABEL ROSAS GARCIA" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={config.nombre_titular || ''} onChange={e => setConfig({...config, nombre_titular: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">CLABE Interbancaria</label>
                      <input required placeholder="Ej. 4169161413445361" type="text" className="bg-black/40 border-none text-white rounded-lg p-3 w-full" value={config.clabe || ''} onChange={e => setConfig({...config, clabe: e.target.value})} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 bg-black/20 p-3 rounded-lg border border-white/5">
                    El asistente virtual pedirá a los clientes que depositen a esta cuenta y a este nombre automáticamente cuando quieran agendar una cita.
                  </p>
                  <button type="submit" className="w-full bg-barber-gold text-black font-bold py-2.5 rounded-lg hover:bg-yellow-500 transition-colors mt-2">Guardar Configuración</button>
                </form>
              )}

              {/* --- TAB CALENDARIO --- */}
              {adminTab === 'calendario' && (
                <div className="space-y-6">

                  {/* DÍAS CERRADOS */}
                  <div className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500/10 p-2 rounded-lg">
                        <CalendarX2 className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Días Cerrados del Negocio</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">El bot bloqueará citas para estos días completamente</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveDiaCerrado} className="flex flex-col sm:flex-row gap-3">
                      <input
                        required
                        type="date"
                        className="bg-black/40 border border-white/5 text-white rounded-lg px-3 py-2.5 text-sm flex-1 focus:outline-none focus:border-red-500/40"
                        value={diaCerradoForm.fecha}
                        onChange={e => setDiaCerradoForm({ ...diaCerradoForm, fecha: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Motivo (ej: día festivo)"
                        className="bg-black/40 border border-white/5 text-white rounded-lg px-3 py-2.5 text-sm flex-1 focus:outline-none focus:border-red-500/40"
                        value={diaCerradoForm.motivo}
                        onChange={e => setDiaCerradoForm({ ...diaCerradoForm, motivo: e.target.value })}
                      />
                      <button type="submit" className="bg-red-500 hover:bg-red-400 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Agregar
                      </button>
                    </form>

                    {diasCerrados.length === 0 ? (
                      <p className="text-center text-zinc-600 text-sm py-3">No hay días cerrados registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {diasCerrados.map(d => (
                          <div key={d.id} className="flex items-center justify-between bg-red-500/5 rounded-xl px-4 py-3 border border-red-500/15">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-white">{new Date(String(d.fecha).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                {d.motivo && <p className="text-xs text-zinc-500 mt-0.5">{d.motivo}</p>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteDiaCerrado(d.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AUSENCIAS DE BARBEROS (vista admin) */}
                  <div className="bg-zinc-800/30 p-5 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500/10 p-2 rounded-lg">
                        <CalendarOff className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Ausencias de Barberos</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Registradas por cada barbero desde su panel. El bot ofrecerá alternativas.</p>
                      </div>
                    </div>

                    {ausencias.length === 0 ? (
                      <p className="text-center text-zinc-600 text-sm py-3">Ningún barbero ha registrado ausencias</p>
                    ) : (
                      <div className="space-y-2">
                        {ausencias.map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-orange-500/5 rounded-xl px-4 py-3 border border-orange-500/15">
                            <div className="flex items-center gap-3">
                              <CalendarX2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-bold text-white">
                                  {a.barbero_nombre}
                                  <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-mono uppercase">ausente</span>
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">{new Date(String(a.fecha).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                {a.motivo && <p className="text-xs text-zinc-600">{a.motivo}</p>}
                              </div>
                            </div>
                            <button onClick={() => { handleDeleteAusencia(a.id); fetchAusencias(); }} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors flex-shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
