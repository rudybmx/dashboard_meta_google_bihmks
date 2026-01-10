import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Save, Trash2, Database } from 'lucide-react';
import { AccountConfig } from '../types';
import { fetchAccountsConfig, saveAccountConfig } from '../services/supabaseService';

export const AccountsConfig: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [franqueado, setFranqueado] = useState('');
  const [nomeAjustado, setNomeAjustado] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await fetchAccountsConfig();
      setAccounts(data);
    } catch (err: any) {
      setError('Erro ao carregar contas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !accountName || !franqueado) {
        setError("Preencha os campos obrigatórios (*)");
        return;
    }

    setSubmitting(true);
    setError(null);

    try {
        await saveAccountConfig({
            account_id: accountId,
            account_name: accountName,
            franqueado: franqueado,
            nome_ajustado: nomeAjustado || undefined
        });

        // Reset form
        setAccountId('');
        setAccountName('');
        setFranqueado('');
        setNomeAjustado('');
        
        // Reload list
        await loadAccounts();
    } catch (err: any) {
        setError('Erro ao salvar: ' + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Configuração de Contas</h2>
                <p className="text-sm text-slate-500">Cadastre as contas de anúncio para importação de dados.</p>
            </div>
            <button 
                onClick={loadAccounts}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Recarregar"
            >
                <Database size={20} />
            </button>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-indigo-500/5 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" />
                Nova Conta
            </h3>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Account ID *</label>
                    <input 
                        type="text" 
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        placeholder="Ex: 123456789"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome da Conta *</label>
                    <input 
                        type="text" 
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        placeholder="Nome original"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Franqueado *</label>
                    <input 
                        type="text" 
                        value={franqueado}
                        onChange={e => setFranqueado(e.target.value)}
                        placeholder="Ex: OP7 | RODRIGO"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nome Ajustado</label>
                    <input 
                        type="text" 
                        value={nomeAjustado}
                        onChange={e => setNomeAjustado(e.target.value)}
                        placeholder="Opcional"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 h-[42px]"
                >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar
                </button>
            </form>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-3xl shadow-lg shadow-indigo-500/5 border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Account ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Conta</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Franqueado</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Ajustado</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Cadastro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 size={20} className="animate-spin text-indigo-500" />
                                        Carregando...
                                    </div>
                                </td>
                            </tr>
                        ) : accounts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                                    Nenhuma conta cadastrada ainda.
                                </td>
                            </tr>
                        ) : (
                            accounts.map((acc) => (
                                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{acc.account_id}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{acc.account_name}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-indigo-600 bg-indigo-50/50 rounded-lg">{acc.franqueado}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 italic">{acc.nome_ajustado || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(acc.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

    </div>
  );
};
