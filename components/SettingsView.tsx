import React, { useState } from 'react';
import { BMSettingsTab } from './BMSettingsTab';
import { FranchiseSettingsTab } from './FranchiseSettingsTab';
import { LayoutList, Store } from 'lucide-react';

export const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'franchises'>('accounts');

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
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 bg-slate-50 overflow-auto p-8">
                {activeTab === 'accounts' ? <BMSettingsTab /> : <FranchiseSettingsTab />}
            </div>
            
        </div>
    );
};
