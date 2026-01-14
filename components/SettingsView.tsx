import React, { useState } from 'react';
import { BMSettingsTab } from './BMSettingsTab';
import { FranchiseSettingsTab } from './FranchiseSettingsTab';
import { UsersSettingsTab } from './UsersSettingsTab';
import { LayoutList, Store, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const SettingsView: React.FC = () => {
    const { canManageUsers } = useAuth();
    const [activeTab, setActiveTab] = useState<'accounts' | 'franchises' | 'users'>('accounts');

    // Security Guard using useEffect pattern for client-side protection
    React.useEffect(() => {
        if (activeTab === 'users' && !canManageUsers) {
             setActiveTab('accounts'); // Redirect to safe tab
             // console.warn("Acesso negado a aba de usuários");
        }
    }, [activeTab, canManageUsers]);

    return (
        <div className="flex flex-col h-full">
            
            {/* Tabs Header */}
            <div className="bg-white border-b border-slate-200 px-8 pt-6">
                <div className="flex items-center gap-8">
                    <button 
                        onClick={() => setActiveTab('accounts')}
                        className={`
                            pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                            ${activeTab === 'accounts' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <LayoutList size={18} />
                        Contas de Anúncio
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('franchises')}
                        className={`
                            pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                            ${activeTab === 'franchises' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                    >
                        <Store size={18} />
                        Gerenciar Franqueados
                    </button>

                    {canManageUsers && (
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`
                                pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-all
                                ${activeTab === 'users' 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <Shield size={18} />
                            Usuários e Acesso
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 bg-slate-50 overflow-auto p-8">
                {activeTab === 'accounts' && <BMSettingsTab />}
                {activeTab === 'franchises' && <FranchiseSettingsTab />}
                {activeTab === 'users' && canManageUsers && <UsersSettingsTab />}
            </div>
            
        </div>
    );
};
