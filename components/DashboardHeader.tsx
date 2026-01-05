import React from 'react';
import { Filter, ChevronDown, Building2, Calendar } from 'lucide-react';

interface Props {
  franchises: string[];
  selectedFranchise: string;
  onSelectFranchise: (val: string) => void;
  accounts: string[];
  selectedAccount: string;
  onSelectAccount: (val: string) => void;
  selectedDateRange: string;
  onSelectDateRange: (val: string) => void;
  customStartDate: string;
  onCustomStartDateChange: (val: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (val: string) => void;
}

export const DashboardHeader: React.FC<Props> = ({ 
  franchises, 
  selectedFranchise, 
  onSelectFranchise,
  accounts,
  selectedAccount,
  onSelectAccount,
  selectedDateRange,
  onSelectDateRange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
      
      {/* Franchise Filter */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Filter size={16} className="text-indigo-500" />
        </div>
        <select
          value={selectedFranchise}
          onChange={(e) => onSelectFranchise(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl pl-10 pr-10 py-2.5 shadow-sm shadow-slate-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
        >
          <option value="all">Todas Franquias</option>
          {franchises.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>

      {/* Account Filter */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Building2 size={16} className="text-orange-500" />
        </div>
        <select
          value={selectedAccount}
          onChange={(e) => onSelectAccount(e.target.value)}
          disabled={accounts.length === 0}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl pl-10 pr-10 py-2.5 shadow-sm shadow-slate-200 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="all">Todas Contas</option>
          {accounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown size={16} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="relative group w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar size={16} className="text-emerald-500" />
        </div>
        <select
          value={selectedDateRange}
          onChange={(e) => onSelectDateRange(e.target.value)}
          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-2xl pl-10 pr-10 py-2.5 shadow-sm shadow-slate-200 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
        >
          <option value="last-7">Últimos 7 Dias</option>
          <option value="last-30">Últimos 30 Dias</option>
          <option value="this-week">Esta Semana</option>
          <option value="last-week">Semana Passada</option>
          <option value="this-month">Este Mês</option>
          <option value="last-month">Mês Passado</option>
          <option value="all">Todo o Período</option>
          <option value="custom">Personalizado</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
        </div>
      </div>

      {/* Custom Date Inputs (Conditional - Appears in the grid if custom is selected) */}
      {selectedDateRange === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300 col-span-1 md:col-span-1">
            <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-2xl px-3 py-2.5 shadow-sm shadow-slate-200 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <span className="text-slate-400 font-medium text-xs">até</span>
            <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndDateChange(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-2xl px-3 py-2.5 shadow-sm shadow-slate-200 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
        </div>
      )}

      {/* Placeholder to keep grid balanced if needed, or Active Badge */}
      {selectedDateRange !== 'custom' && (
         <div className="hidden xl:flex items-center justify-end">
            {(selectedFranchise !== 'all' || selectedAccount !== 'all' || selectedDateRange !== 'all') && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 animate-in fade-in zoom-in duration-300">
                    Filtros Ativos
                </span>
            )}
         </div>
      )}
    </div>
  );
};