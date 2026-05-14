import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Scissors, User, Lock, Loader2 } from 'lucide-react';

const API_URL = 'https://bot-coversacional-production.up.railway.app/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}/login`, form);
      if (res.data.success) {
        localStorage.setItem('isa_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-barber-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-barber-gold/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-zinc-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-barber-gold/20 to-zinc-800/50 border border-barber-gold/30 shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-6">
            <Scissors className="w-10 h-10 text-barber-gold" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">ISA</h1>
          <p className="text-barber-gold/90 font-medium tracking-[0.2em] text-sm mt-1">CORTES Y ESTILOS</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-barber-gray/80 backdrop-blur-xl rounded-3xl p-8 space-y-6 border border-white/5 shadow-2xl">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Usuario</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-barber-gold transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                value={form.usuario}
                onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}
                className="w-full bg-zinc-900/50 text-white rounded-xl pl-11 pr-4 py-3.5 border border-white/10 focus:border-barber-gold focus:ring-1 focus:ring-barber-gold focus:outline-none transition-all placeholder:text-zinc-600 font-medium"
                placeholder="Ingresa tu usuario"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Contraseña</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-barber-gold transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-zinc-900/50 text-white rounded-xl pl-11 pr-4 py-3.5 border border-white/10 focus:border-barber-gold focus:ring-1 focus:ring-barber-gold focus:outline-none transition-all placeholder:text-zinc-600 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] disabled:opacity-70 text-barber-dark font-black uppercase tracking-wider rounded-xl py-4 mt-2 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
