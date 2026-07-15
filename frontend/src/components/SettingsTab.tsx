import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Loader2, Save, Trash2, Key } from 'lucide-react';
import { api } from '../services/api';

export default function SettingsTab({ showAlert }: { showAlert: (t:any, title:string, msg:string) => void }) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('mecanico');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const data = await api.request<any[]>('/tenant/usuarios');
      setUsuarios(data);
    } catch (err: any) {
      showAlert('error', 'Erro', 'Falha ao carregar usuários: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.request('/tenant/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha, perfil })
      });
      showAlert('success', 'Usuário Criado', 'Usuário foi criado com sucesso.');
      setShowForm(false);
      setNome('');
      setEmail('');
      setSenha('');
      setPerfil('mecanico');
      loadUsuarios();
    } catch (err: any) {
      showAlert('error', 'Erro', err.message || 'Falha ao criar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuários e Permissões</h2>
          <p className="text-sm text-slate-500">Gerencie quem tem acesso ao sistema da sua empresa.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {showForm ? 'Cancelar' : <><UserPlus className="w-4 h-4" /> Novo Usuário</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b pb-2">Cadastrar Acesso de Usuário</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
              <input required type="text" value={nome} onChange={e=>setNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail de Login</label>
              <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Senha Provisória</label>
              <input required type="password" value={senha} onChange={e=>setSenha(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Perfil de Acesso</label>
              <select value={perfil} onChange={e=>setPerfil(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="admin">Administrador Geral</option>
                <option value="mecanico">Mecânico / Técnico</option>
                <option value="recepcao">Recepção / Atendimento</option>
                <option value="financeiro">Financeiro / Caixa</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button disabled={submitting} type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? 'Salvando...' : 'Salvar Acesso'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários...
          </div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhum usuário cadastrado além do administrador principal.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">E-mail</th>
                <th className="px-6 py-3">Perfil Principal</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-6 py-4 text-slate-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold capitalize border border-indigo-100">
                      {u.perfil || 'Sem Perfil'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${u.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
