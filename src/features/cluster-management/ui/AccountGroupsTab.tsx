import React, { useState } from 'react';
import { useClusters, useManageClusters, useClusterAccounts } from '../../../entities/cluster/api/useClusters';
import { useSettingsData } from '../../../../context/SettingsDataContext';
import { Folder, Plus, Trash2, CheckSquare, Square, Loader2 } from 'lucide-react';

export const AccountGroupsTab: React.FC = () => {
    const { data: clusters = [], isLoading: isLoadingClusters } = useClusters();
    const { createCluster, deleteCluster, linkAccounts } = useManageClusters();
    const { accounts } = useSettingsData(); // from context

    // UI states
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Derived selected cluster
    const selectedCluster = clusters.find(c => c.id === selectedClusterId);

    // Cluster accounts
    const { data: clusterAccounts = [], isLoading: isLoadingAccounts } = useClusterAccounts(selectedClusterId);
    const linkedAccountIds = clusterAccounts.map(ca => ca.account_id);

    // Account toggle handler
    const handleToggleAccount = (accountId: string) => {
        if (!selectedClusterId) return;

        let newLinkedIds = [...linkedAccountIds];
        if (newLinkedIds.includes(accountId)) {
            newLinkedIds = newLinkedIds.filter(id => id !== accountId);
        } else {
            newLinkedIds.push(accountId);
        }

        linkAccounts.mutate({ clusterId: selectedClusterId, accountIds: newLinkedIds });
    };

    const handleCreateCluster = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setIsCreating(true);
        try {
            await createCluster.mutateAsync(newGroupName);
            setNewGroupName('');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCluster = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja deletar este grupo? Ele será removido com todas as vinculações.')) {
            await deleteCluster.mutateAsync(id);
            if (selectedClusterId === id) setSelectedClusterId(null);
        }
    };

    if (isLoadingClusters) {
        return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[600px]">

                {/* Left Panel: List of Clusters */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50/50">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Folder size={18} className="text-indigo-600" /> Grupos de Contas
                        </h3>
                        <form onSubmit={handleCreateCluster} className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Novo grupo..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newGroupName.trim() || isCreating}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Plus size={18} />
                            </button>
                        </form>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {clusters.map(cluster => (
                            <div
                                key={cluster.id}
                                onClick={() => setSelectedClusterId(cluster.id)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${selectedClusterId === cluster.id ? 'bg-indigo-50 border-indigo-200 border' : 'hover:bg-slate-100 border border-transparent'}`}
                            >
                                <span className="font-medium text-sm text-slate-700 truncate">{cluster.name}</span>
                                <button
                                    onClick={(e) => handleDeleteCluster(e, cluster.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 justify-center items-center flex rounded-md"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {clusters.length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-6">Nenhum grupo criado</p>
                        )}
                    </div>
                </div>

                {/* Right Panel: Accounts Assignment */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedCluster ? (
                        <>
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Contas do grupo: {selectedCluster.name}</h3>
                                <p className="text-sm text-slate-500">Selecione as contas que pertencem a este grupo.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {isLoadingAccounts ? (
                                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {accounts.filter(a => a.status !== 'removed' && a.client_visibility !== false).map(account => {
                                            const isLinked = linkedAccountIds.includes(account.account_id);
                                            return (
                                                <div
                                                    key={account.account_id}
                                                    onClick={() => handleToggleAccount(account.account_id)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isLinked ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {isLinked ? (
                                                        <CheckSquare className="text-indigo-600" size={18} />
                                                    ) : (
                                                        <Square className="text-slate-300" size={18} />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className={`text-sm font-medium truncate ${isLinked ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {(account as any).nome_ajustado || (account as any).nome_original}
                                                        </p>
                                                        <p className="text-xs text-slate-400 truncate">{account.account_id}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
                            <Folder size={48} className="text-slate-200" />
                            <p>Selecione ou crie um grupo ao lado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
