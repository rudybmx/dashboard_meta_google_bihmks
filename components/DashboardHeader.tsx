import React from 'react';
import { Filter, ChevronDown, Building2, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
      <Select value={selectedFranchise} onValueChange={onSelectFranchise}>
        <SelectTrigger className="w-full pl-10 h-10 bg-background border-input">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter size={16} className="text-secondary-foreground" />
             </div>
             <SelectValue placeholder="Todas Franquias" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">Todas Franquias</SelectItem>
            {franchises.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Account Filter */}
      <Select value={selectedAccount} onValueChange={onSelectAccount} disabled={accounts.length === 0}>
        <SelectTrigger className="w-full pl-10 h-10 bg-background border-input">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Building2 size={16} className="text-orange-500" />
             </div>
             <SelectValue placeholder="Todas Contas" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">Todas Contas</SelectItem>
            {accounts.map(acc => (
                <SelectItem key={acc} value={acc}>{acc}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Select value={selectedDateRange} onValueChange={onSelectDateRange}>
        <SelectTrigger className="w-full pl-10 h-10 bg-background border-input">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Calendar size={16} className="text-emerald-500" />
             </div>
             <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last-7">Últimos 7 Dias</SelectItem>
          <SelectItem value="last-30">Últimos 30 Dias</SelectItem>
          <SelectItem value="this-week">Esta Semana</SelectItem>
          <SelectItem value="last-week">Semana Passada</SelectItem>
          <SelectItem value="this-month">Este Mês</SelectItem>
          <SelectItem value="last-month">Mês Passado</SelectItem>
          <SelectItem value="all">Todo o Período</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Inputs (Conditional - Appears in the grid if custom is selected) */}
      {selectedDateRange === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300 col-span-1 md:col-span-1">
            <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            className="w-full bg-background border border-input text-foreground text-xs font-medium rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all h-10"
            />
            <span className="text-muted-foreground font-medium text-xs">até</span>
            <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndDateChange(e.target.value)}
            className="w-full bg-background border border-input text-foreground text-xs font-medium rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all h-10"
            />
        </div>
      )}

      {/* Filter Badge - Only show if not custom date (to balance grid) */}
      {selectedDateRange !== 'custom' && (
         <div className="hidden xl:flex items-center justify-end">
            {(selectedFranchise !== 'all' || selectedAccount !== 'all' || selectedDateRange !== 'all') && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 animate-in fade-in zoom-in duration-300">
                    Filtros Ativos
                </span>
            )}
         </div>
      )}
    </div>
  );
};