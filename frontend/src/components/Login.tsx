import React, { useState } from 'react';
import { Layers, ShieldCheck, Database, LogIn } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, tenantId: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('admin@servicopro.local');
  const [password, setPassword] = useState('123456');
  const [tenantId, setTenantId] = useState('t-oficina-01');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Usando o proxy configurado para o backend .NET na porta 7771
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password, tenantId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.mensagem || 'Credenciais inválidas');
      }

      const data = await res.json();
      
      // Armazena no localStorage
      localStorage.setItem('servicopro_token', data.accessToken);
      localStorage.setItem('servicopro_tenant', JSON.stringify(data.tenant));
      localStorage.setItem('servicopro_user', JSON.stringify(data.usuario));

      onLoginSuccess(data.accessToken, data.tenant.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800">
      {/* Lado Esquerdo - Info/Branding */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background FX */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <Layers className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold font-mono tracking-tight">ServiçoPro<span className="text-emerald-400">.OS</span></h1>
          </div>
          
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            O motor de operações <br /> para o seu negócio.
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Arquitetura multi-tenant escalável, bancos de dados isolados e controle total de fluxo de trabalho.
          </p>
        </div>

        <div className="relative z-10 flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Clean Architecture
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-300">
            <Database className="w-4 h-4 text-indigo-400" /> Isolamento por Tenant
          </div>
        </div>
      </div>

      {/* Lado Direito - Form de Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <Layers className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold font-mono tracking-tight">ServiçoPro<span className="text-emerald-500">.OS</span></h1>
            </div>
            <h2 className="text-3xl font-bold mb-2">Bem-vindo de volta</h2>
            <p className="text-slate-500">Insira suas credenciais para acessar seu workspace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Empresa (Tenant ID)</label>
              <input 
                type="text" 
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="Ex: t-oficina-01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="admin@servicopro.local"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                <a href="#" className="text-xs text-emerald-600 font-semibold hover:text-emerald-700">Esqueceu a senha?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> Entrar no Sistema
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Para o MVP, use <strong>t-oficina-01</strong>, <strong>admin@servicopro.local</strong>, e senha <strong>123456</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
