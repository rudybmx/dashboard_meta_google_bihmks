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
  metaAccounts: any[];
  userRole?: string;
  assignedAccountIds?: string[]; // RBAC: User's assigned account IDs
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
  metaAccounts,
  userRole,
  assignedAccountIds
}) => {

  // 1. Prepare Franchise Options from available list (Deduplicated)
  const franchiseOptions = useMemo(() => {
    // Unique by name to prevent duplicate keys
    const unique = new Map();
    availableFranchises.forEach(f => {
      if (!unique.has(f.name)) {
        unique.set(f.name, { value: f.name, label: f.name });
      }
    });
    return Array.from(unique.values());
  }, [availableFranchises]);

  // 2. Extract Clients (Filtered by Franchisee)
  // When there's only 1 available franchise, auto-filter by that franchise even if not selected
  const effectiveFranchiseFilter = selectedFranchisee || (availableFranchises.length === 1 ? availableFranchises[0].name : '');

  const clients = useMemo(() => {
    let filtered = metaAccounts || [];

    // Step 1: Filter by selected franchise
    if (effectiveFranchiseFilter) {
      // Filter the metaAccounts list by franchise name (franchise_id stores name, not UUID)
      filtered = filtered.filter(acc => acc.franchise_id === effectiveFranchiseFilter);
    }

    // Step 2: Apply RBAC - Filter by user's assigned accounts
    // Admins and executives see all accounts, other roles are restricted
    const isAdmin = userRole === 'admin' || userRole === 'executive';

    if (!isAdmin && assignedAccountIds && assignedAccountIds.length > 0) {
      filtered = filtered.filter(acc => {
        // Normalize account IDs (remove 'act_' prefix if present for comparison)
        const normalizedAccId = acc.account_id.replace(/^act_/i, '');
        return assignedAccountIds.some(allowedId => {
          const normalizedAllowedId = allowedId.replace(/^act_/i, '');
          return normalizedAccId === normalizedAllowedId || acc.account_id === allowedId;
        });
      });
    }

    // Step 3: Filter by Visibility Settings
    // Only show accounts marked as visible (client_visibility === true OR null/undefined if legacy)
    // We assume explicit false means hidden
    filtered = filtered.filter(acc => acc.client_visibility !== false);

    // Sort and map to options format
    // Use display_name (Nome Ajustado) if filled, otherwise use account_name (Nome da Conta)
    return filtered
      .map(acc => ({
        value: acc.account_id,
        label: acc.display_name || acc.account_name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [metaAccounts, effectiveFranchiseFilter, userRole, assignedAccountIds]);

  const isClientRole = userRole === 'client';

  // Determine if we should show the "All" option
  const showAllOption = franchiseOptions.length > 1;

  return (
    <div className="flex h-20 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-50 relative">

      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
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
              value={effectiveFranchiseFilter}
              onChange={(e) => {
                setSelectedFranchisee(e.target.value);
                setSelectedClient(''); // Reset client
              }}
              options={showAllOption ? [{ value: '', label: 'Todos Franqueados' }, ...franchiseOptions] : franchiseOptions}
              disabled={isLocked || franchiseOptions.length <= 1}
            />
            {(isLocked || franchiseOptions.length <= 1) && <div className="absolute top-1/2 right-8 -translate-y-1/2 pointer-events-none text-slate-400"><Filter size={12} className="opacity-50" /></div>}
          </div>
        )}

        {/* 2. Cliente */}
        <div className="w-[220px]">
          <Select
            placeholder="Todas as Contas"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            options={[{ value: '', label: 'Todas Contas' }, ...clients]}
            disabled={isLocked && clients.length <= 1} // Only disable if locked and single client
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
          />
        </div>
      </div>
    </div>
  );
};