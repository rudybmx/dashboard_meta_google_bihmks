import React, { useMemo } from 'react';
import { Calendar, RangeValue } from '@/src/shared/ui/calendar';
import { Select } from '@/src/shared/ui/select-1';
import { Filter, CalendarDays, Folder, Check, ChevronsUpDown } from 'lucide-react';
import { CampaignData } from '../types';
import { useClusters } from '@/src/entities/cluster/api/useClusters';
import { subDays, startOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/src/shared/ui/badge';
import { Button } from '@/src/shared/ui/button';
import { cn } from '@/src/shared/lib/utils';

interface DashboardHeaderProps {
  title: string;
  data: CampaignData[];
  selectedClients: string[];
  setSelectedClients: (val: string[]) => void;
  dateRange: RangeValue | null;
  setDateRange: (range: RangeValue | null) => void;
  selectedCluster?: string;
  setSelectedCluster?: (val: string) => void;
  isLocked?: boolean;
  availableFranchises: { id: string; name: string }[];
  metaAccounts: any[];
  userRole?: string;
  assignedAccountIds?: string[]; // RBAC: User's assigned account IDs
  assignedClusterIds?: string[]; // RBAC: User's assigned cluster IDs
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  data,
  selectedClients,
  setSelectedClients,
  dateRange,
  setDateRange,
  isLocked = false,
  availableFranchises,
  metaAccounts,
  userRole,
  assignedAccountIds,
  assignedClusterIds,
  selectedCluster,
  setSelectedCluster
}) => {
  const { data: clusters = [] } = useClusters();
  const [open, setOpen] = React.useState(false);

  const filteredClusters = useMemo(() => {
    // Documentação de Hierarquia de Acesso (RBAC):
    // A nova hierarquia de acesso segue o fluxo: User -> Clusters -> Accounts.
    // 1. Usuários recebem permissão de visualizar Clusters (Grupos).
    // 2. A partir da seleção do Cluster, visualizam as Contas (Accounts).
    // Se o usuário não for admin e não tiver grupos, retorna vazio (ocultando o seletor).
    if (userRole === 'admin' || userRole === 'executive') return clusters;
    if (!assignedClusterIds || assignedClusterIds.length === 0) return [];
    return clusters.filter(c => assignedClusterIds.includes(c.id));
  }, [clusters, userRole, assignedClusterIds]);

  // 1. Prepare Franchise Options - REMOVED


  // 2. Extract Clients

  const clients = useMemo(() => {
    let filtered = metaAccounts || [];

    // Step 1: Filter by selected cluster (Cascade Logic)
    if (selectedCluster && selectedCluster !== 'ALL') {
      const clusterAccountIds = clusters.find(c => c.id === selectedCluster)?.cluster_accounts?.map(ca => ca.account_id) || [];
      filtered = filtered.filter(acc => clusterAccountIds.includes(acc.account_id));
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
    // Step 3: Filter by Visibility Settings
    // Only show accounts marked as visible (client_visibility === true OR null/undefined if legacy)
    // Sort and map to options format
    // Use display_name (Nome Ajustado) if filled, otherwise use account_name (Nome da Conta)
    const clientOptions = filtered
      .filter(acc => acc.client_visibility !== false)
      .map(acc => ({
        value: acc.account_id,
        label: acc.display_name || acc.account_name,
        id: acc.account_id
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Optional: add a virtual "ALL" option inside the combobox, or rely on empty array to mean ALL
    return clientOptions;
  }, [metaAccounts, userRole, assignedAccountIds, selectedCluster, clusters]);

  const toggleClient = (value: string) => {
    if (value === 'ALL') {
      setSelectedClients(selectedClients.includes('ALL') || selectedClients.length === 0 ? [] : ['ALL']);
      return;
    }

    // Clear 'ALL' if a specific item is checked
    let newSelected = selectedClients.filter(val => val !== 'ALL');

    if (newSelected.includes(value)) {
      newSelected = newSelected.filter(val => val !== value);
    } else {
      newSelected = [...newSelected, value];
    }

    if (newSelected.length === 0) {
      setSelectedClients([]);
    } else {
      setSelectedClients(newSelected);
    }
  };

  const getBadgeText = () => {
    if (!selectedClients || selectedClients.length === 0 || selectedClients.includes('ALL')) return `Todas as unidades (${clients.length})`;
    if (selectedClients.length === 1) return `1 unidade selecionada`;
    return `${selectedClients.length} unidades selecionadas`;
  };

  const isClientRole = userRole === 'client';

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

        {/* 1. Franqueado (Hidden for Clients) - REMOVED */}


        {/* 1.5 Agrupamento */}
        {filteredClusters.length > 0 && selectedCluster !== undefined && setSelectedCluster && (
          <div className="w-[200px]">
            <Select
              placeholder="Agrupamento"
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              options={[
                { value: 'ALL', label: 'Todos os agrupamentos' },
                ...filteredClusters.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>
        )}

        {/* 2. Cliente com Combobox Searchable */}
        <div className="flex items-center gap-2">
          {(!selectedClients || selectedClients.length === 0 || selectedClients.includes('ALL') ? false : true) && (
            <Badge variant="secondary" className="font-normal border-indigo-100 bg-indigo-50 text-indigo-700">
              {getBadgeText()}
            </Badge>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[280px] justify-between border-slate-200 font-normal bg-white"
              >
                <div className="flex items-center gap-1 overflow-hidden text-slate-600">
                  <span className="truncate">
                    {(!selectedClients || selectedClients.length === 0 || selectedClients.includes('ALL'))
                      ? "Selecione Unidades..."
                      : (selectedClients.length === 1
                        ? clients.find(c => c.value === selectedClients[0])?.label || "1 selecionada"
                        : getBadgeText())}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 shadow-lg" align="end">
              <Command>
                <CommandInput placeholder="Buscar unidade ou ID..." />
                <CommandList>
                  <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedClients([]);
                        setOpen(false);
                      }}
                      className="cursor-pointer font-medium text-slate-800"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-indigo-500",
                            (!selectedClients || selectedClients.length === 0 || selectedClients.includes('ALL')) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Todas as contas ({clients.length})
                      </div>
                    </CommandItem>
                  </CommandGroup>
                  <CommandGroup heading="Contas de Anúncio">
                    {clients.map((client) => (
                      <CommandItem
                        key={client.value}
                        value={client.label + ' ' + client.id} // Searchable by title or ID
                        onSelect={() => toggleClient(client.value)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center w-full min-w-0">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0 text-indigo-500",
                              selectedClients.includes(client.value) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col overflow-hidden w-full">
                            <span className="truncate text-slate-800 leading-tight" title={client.label}>
                              {client.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              ID: {client.id}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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