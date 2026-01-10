import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Store,
  RefreshCw,
  AlertCircle 
} from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import { Franchise } from '../types';

export const FranchiseSettingsTab: React.FC = () => {
    const [franchises, setFranchises] = useState<Franchise[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await supabaseService.fetchFranchises();
            setFranchises(data);
        } catch (err) {
            console.error("Failed to load franchises", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            const newFranchise = await supabaseService.createFranchise(newName.trim());
            setFranchises(prev => [newFranchise, ...prev]);
            setNewName('');
            setFeedback({ type: 'success', text: 'Franqueado cadastrado com sucesso!' });
            setTimeout(() => setFeedback(null), 3000);
        } catch (err) {
            console.error(err);
            setFeedback({ type: 'error', text: 'Erro ao cadastrar. Verifique se o nome é único.' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? Isso removerá a visualização da unidade.')) return;
        
        // Optimistic
        setFranchises(prev => prev.filter(f => f.id !== id));

        try {
            await supabaseService.toggleFranchiseStatus(id, false);
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir');
            loadData(); // Revert
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-8 text-center sm:text-left">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 justify-center sm:justify-start">
                    <Store className="text-indigo-600" />
                    Gestão de Unidades (Franqueados)
                </h2>
                <p className="text-sm text-slate-500 mt-1">Cadastre as unidades para vincular nas contas de anúncio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Form Section */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Novo Cadastro</h3>
                        <form onSubmit={handleAdd} className="flex flex-col gap-3">
                            <input 
                                type="text"
                                placeholder="Nome (ex: OP7 | Maceió)"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <button 
                                type="submit"
                                disabled={!newName.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                Cadastrar
                            </button>
                        </form>
                        
                        {feedback && (
                            <div className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                {feedback.type === 'success' ? <RefreshCw size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                                {feedback.text}
                            </div>
                        )}
                    </div>
                </div>

                {/* List Section */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase">Unidades Ativas</span>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{franchises.length}</span>
                        </div>
                        
                        <ul className="divide-y divide-slate-100">
                            {franchises.length === 0 ? (
                                <li className="p-8 text-center text-slate-400 text-sm">Nenhuma unidade encontrada.</li>
                            ) : (
                                franchises.map(f => (
                                    <li key={f.id} className="group p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {f.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-700">{f.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(f.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Desativar/Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
};

const Loader = () => (
    <div className="animate-spin text-indigo-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    </div>
);
