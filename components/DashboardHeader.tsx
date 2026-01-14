import React, { useMemo } from 'react';
import { Calendar, RangeValue } from '@/components/ui/calendar';
import { Select } from '@/components/ui/select-1'; 
import { Filter, CalendarDays } from 'lucide-react';
import { CampaignData } from '../types';
import { subDays, startOfMonth } from 'date-fns';

interface DashboardHeaderProps {
  title: string;
  data: CampaignData[];
  selectedFranchisee: string;
  setSelectedFranchisee: (val: string) => void;
  selectedClient: string;
  setSelectedClient: (val: string) => void;
  dateRange: RangeValue | null;
  setDateRange: (range: RangeValue | null) => void;
  isLocked?: boolean;
  availableFranchises: { id: string; name: string }[];
  userRole?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  data,
  selectedFranchisee,
  setSelectedFranchisee,
  selectedClient,
  setSelectedClient,
  dateRange,
  setDateRange,
  isLocked = false,
  availableFranchises,
  userRole
}) => {
  
  // 1. Prepare Franchise Options from available list
  // If user is admin, we might want "All". If limited, we show only limited.
  const franchiseOptions = useMemo(() => {
     return availableFranchises.map(f => ({ value: f.name, label: f.name }));
  }, [availableFranchises]);

  // 2. Extract Clients (Filtered by Franchisee)
  // This logic stays the same: showing clients present in the CURRENT data
  const clients = useMemo(() => {
    let filtered = data;
    if (selectedFranchisee) {
      filtered = data.filter(item => item.franqueado === selectedFranchisee);
    }
    const unique = new Set(filtered.map(item => item.account_name).filter(Boolean));
    return Array.from(unique).sort().map(c => ({ value: c, label: c }));
  }, [data, selectedFranchisee]);

  const isClientRole = userRole === 'client';
  
  // Determine if we should show the "All" option
  // Only show "All" if user has access to more than 1 franchise (or is admin)
  const showAllOption = franchiseOptions.length > 1;

  return (
    <div className="flex h-20 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-50 relative">
      
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Dados atualizados
        </p>
      </div>

      {/* Right: Global Filters Toolbar */}
      <div className="flex items-center gap-3">
        
        {/* 1. Franqueado (Hidden for Clients) */}
        {!isClientRole && (
            <div className="w-[220px]">
            <Select
                placeholder="Selecione Franquia"
                value={selectedFranchisee}
                onChange={(e) => {
                    setSelectedFranchisee(e.target.value);
                    setSelectedClient(''); // Reset client
                }}
                options={showAllOption ? [{value: '', label: 'Todos Franqueados'}, ...franchiseOptions] : franchiseOptions}
                disabled={isLocked || franchiseOptions.length <= 1}
            />
            {(isLocked || franchiseOptions.length <= 1) && <div className="absolute top-1/2 right-8 -translate-y-1/2 pointer-events-none text-slate-400"><Filter size={12} className="opacity-50"/></div>}
            </div>
        )}

        {/* 2. Cliente */}
        <div className="w-[220px]">
          <Select
            placeholder="Todas as Contas"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            options={[{value: '', label: 'Todas Contas'}, ...clients]}
            disabled={!selectedFranchisee}
          />
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        {/* 3. CALENDAR WRAPPER - This fixes the 'not clickable' issue */}
        <div className="relative isolate z-50"> 
          <Calendar
            compact={false}
            allowClear
            showTimeInput={false}
            popoverAlignment="end" // Opens to the left
            value={dateRange}
            onChange={setDateRange}
            presets={{
              last7: { text: "Últimos 7 dias", start: subDays(new Date(), 7), end: new Date() },
              last30: { text: "Últimos 30 dias", start: subDays(new Date(), 30), end: new Date() },
              thisMonth: { text: "Este Mês", start: startOfMonth(new Date()), end: new Date() }
            }}
          />
        </div>
      </div>
    </div>
  );
};