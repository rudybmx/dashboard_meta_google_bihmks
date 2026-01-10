import React, { useState, useEffect, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  getSortedRowModel
} from '@tanstack/react-table';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  EyeOff, 
  Link as LinkIcon, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import { MetaAdAccount, Franchise } from '../types';

export const BMSettingsTab: React.FC = () => {
  const [data, setData] = useState<MetaAdAccount[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'removed'>('all');
  const [franchiseFilter, setFranchiseFilter] = useState<string>('all');
  
  // Fetch Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [accounts, franchiseList] = await Promise.all([
            supabaseService.fetchMetaAccounts(),
            supabaseService.fetchFranchises()
        ]);
        setData(accounts);
        setFranchises(franchiseList);
    } catch (err) {
        console.error("Failed to load settings", err);
    } finally {
        setLoading(false);
    }
  };

  // Optimistic Update Helper
  const handleUpdate = async (id: string, updates: Partial<MetaAdAccount>, persist: boolean = true) => {
      // Optimistic UI Update
      setData(prev => prev.map(row => row.id === id ? { ...row, ...updates } : row));

      if (persist) {
        try {
            await supabaseService.updateMetaAccount(id, updates);
        } catch (err) {
            console.error("Failed to update", err);
            loadData();
        }
      }
  };

  // Columns Definition
  const columns = useMemo<ColumnDef<MetaAdAccount>[]>(() => [
    {
        id: 'status',
        accessorKey: 'status',
        header: '',
        size: 30,
        cell: ({ row }) => {
            const status = row.original.status;
            return (
                <div className="flex justify-center">
                    {status === 'active' ? (
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" title="Active"></div>
                    ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" title="Removed"></div>
                    )}
                </div>
            )
        }
    },
    {
        header: 'Conta de Anúncio',
        accessorKey: 'account_name',
        cell: ({ row }) => {
             const original = row.original;
             return (
                 <div className="flex flex-col leading-tight max-w-[200px]">
                     <span className="font-semibold text-slate-700 text-xs truncate" title={original.account_name}>{original.account_name}</span>
                     <span className="font-mono text-[9px] text-slate-400">{original.account_id}</span>
                 </div>
             )
        }
    },
    {
        header: 'Nome Dashboard',
        accessorKey: 'display_name',
        cell: ({ row }) => {
            // Use directly from row data (optimistic state)
            const value = row.original.display_name || '';

            return (
                <input 
                    className="w-full max-w-[180px] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-xs py-0.5 transition-colors pl-0 placeholder:text-slate-300"
                    value={value}
                    onChange={e => handleUpdate(row.original.id, { display_name: e.target.value }, false)}
                    disabled={row.original.status === 'removed'}
                    placeholder={row.original.account_name} 
                />
            );
        }
    },
    {
        header: 'Franqueado Vinculado',
        accessorKey: 'franchise_id',
        cell: ({ row }) => {
            const currentFranchiseId = row.original.franchise_id;
            
            return (
                <div className="relative w-[180px]">
                    <select
                        className={`
                            appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-1 pl-2 pr-6 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all
                            ${!currentFranchiseId ? 'text-slate-400 italic' : ''}
                        `}
                        value={currentFranchiseId || ''}
                        onChange={(e) => handleUpdate(row.original.id, { franchise_id: e.target.value || null as any }, true)}
                        disabled={row.original.status === 'removed'}
                    >
                        <option value="">-- Vincular --</option>
                        {franchises.map(f => (
                            <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-slate-500">
                        <LinkIcon size={12} />
                    </div>
                </div>
            );
        }
    },
    {
        header: 'Visibilidade',
        accessorKey: 'client_visibility',
        cell: ({ row }) => {
            const isVisible = row.original.client_visibility;
            return (
                <button 
                    onClick={() => handleUpdate(row.original.id, { client_visibility: !isVisible })}
                    disabled={row.original.status === 'removed'}
                    className={`
                        flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold transition-all border
                        ${isVisible 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }
                    `}
                >
                    {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                    {isVisible ? 'Visível' : 'Oculto'}
                </button>
            )
        }
    },
    {
        header: 'Saldo',
        accessorKey: 'current_balance',
        cell: ({ row }) => {
            const balance = row.original.current_balance;
            const isLow = balance < 100;
            return (
                <div className={`font-mono text-xs font-bold ${isLow ? 'text-red-500' : 'text-slate-700'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                </div>
            )
        }
    },
    {
        header: 'Status',
        accessorKey: 'status_meta',
        cell: ({ row }) => (
            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                row.original.status_meta === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
                {row.original.status_meta || 'N/A'}
            </span>
        )
    },
    {
        header: 'Obs',
        accessorKey: 'motivo_bloqueio',
        cell: ({ row }) => (
            <span className="text-[10px] text-slate-500 truncate max-w-[100px] block" title={row.original.motivo_bloqueio}>
                {row.original.motivo_bloqueio || '-'}
            </span>
        )
    },
    {
        header: 'Total Gasto',
        accessorKey: 'total_gasto',
        cell: ({ row }) => (
            <span className="font-mono text-[10px] text-slate-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(row.original.total_gasto || 0)}
            </span>
        )
    },
    {
        header: 'Classificação',
        accessorKey: 'status_interno',
        cell: ({ row }) => {
            const [val, setVal] = useState(row.original.status_interno || 'A Classificar');
            const hasChanged = val !== row.original.status_interno;
            
            return (
                <div className="flex items-center gap-1">
                     <select 
                        value={val}
                        onChange={(e) => {
                            setVal(e.target.value);
                            handleUpdate(row.original.id, { status_interno: e.target.value }, false); // Update generic state only
                        }}
                        className={`text-[10px] font-medium border rounded px-1.5 py-0.5 focus:outline-none cursor-pointer ${
                            val === 'A Classificar' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 
                            val === 'OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                            'bg-white border-slate-200 text-slate-700'
                        }`}
                     >
                        <option value="A Classificar">Classificar</option>
                        <option value="OK">OK</option>
                        <option value="Bloqueado">Bloqueado</option>
                        <option value="Cancelado">Cancelado</option>
                     </select>
                </div>
            )
        }
    },
    {
        id: 'actions',
        header: '',
        size: 40,
        cell: ({ row }) => {
             return (
                 <button 
                    onClick={() => handleUpdate(row.original.id, { 
                        display_name: row.original.display_name,
                        status_interno: row.original.status_interno 
                    }, true)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Salvar Alterações"
                 >
                     <CheckCircle2 size={16} />
                 </button>
             )
        }
    }
  ], [franchises]);

  // Filtering Logic
  const filteredData = useMemo(() => {
     return data.filter(item => {
         // Global Search
         const searchLower = globalFilter.toLowerCase();
         const matchesSearch = 
            item.account_name.toLowerCase().includes(searchLower) || 
            item.account_id.toLowerCase().includes(searchLower) ||
            (item.display_name || '').toLowerCase().includes(searchLower);
        
         // Status Filter
         const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;

         // Franchise Filter
         let matchesFranchise = true;
         if (franchiseFilter === 'unassigned') matchesFranchise = !item.franchise_id;
         else if (franchiseFilter !== 'all') matchesFranchise = item.franchise_id === franchiseFilter;

         return matchesSearch && matchesStatus && matchesFranchise;
     });
  }, [data, globalFilter, statusFilter, franchiseFilter]);

  const table = useReactTable<MetaAdAccount>({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false, // Prevents reset on data update
    initialState: {
        pagination: {
            pageSize: 25,
        }
    }
  });

  if (loading) {
      return (
          <div className="flex items-center justify-center h-96">
              <div className="animate-spin text-indigo-600"><RefreshCw /></div>
          </div>
      )
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Gestão de Contas de Anúncios</h1>
           <p className="text-slate-500 text-sm">Controle mestre de vinculação entre BM e Franqueados.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar Conta ou ID..." 
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all shadow-sm"
                    value={globalFilter}
                    onChange={e => setGlobalFilter(e.target.value)}
                />
            </div>

            {/* Franchise Filter */}
            <div className="relative">
                <select 
                    className="pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-48 appearance-none shadow-sm text-slate-600 font-medium"
                    value={franchiseFilter}
                    onChange={e => setFranchiseFilter(e.target.value)}
                >
                    <option value="all">Todas as Contas</option>
                    <option value="unassigned">⚠️ Sem Vinculo</option>
                    <option disabled>──────────</option>
                    {franchises.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Filter size={14} />
                </div>
            </div>

             {/* Status Toggle */}
             <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     Todos
                 </button>
                 <button 
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'active' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     Ativos
                 </button>
             </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Contas</span>
              <span className="text-2xl font-black text-slate-800">{filteredData.length}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Visíveis</span>
              <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-emerald-600">{filteredData.filter(d => d.client_visibility).length}</span>
                  <Eye size={16} className="text-emerald-400" />
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ocultas</span>
              <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-500">{filteredData.filter(d => !d.client_visibility).length}</span>
                  <EyeOff size={16} className="text-slate-400" />
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Total</span>
              <span className="text-xl md:text-2xl font-black text-indigo-600 truncate">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredData.reduce((acc, curr) => acc + curr.current_balance, 0))}
              </span>
          </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                        {headerGroup.headers.map(header => (
                            <th key={header.id} className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                        <tr 
                            key={row.id} 
                            className={`group hover:bg-slate-50/80 transition-colors ${row.original.status === 'removed' ? 'opacity-50 grayscale' : ''}`}
                        >
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-4 py-3">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <Search size={32} className="opacity-20" />
                                <p>Nenhuma conta encontrada com os filtros atuais.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
        
        {/* Footer / Pagination */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
             <span className="text-xs text-slate-400">
                 Mostrando {table.getRowModel().rows.length} contas
             </span>
             <div className="flex gap-2">
                 <button 
                    onClick={() => table.previousPage()} 
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 rounded bg-white border border-slate-200 text-xs font-semibold disabled:opacity-50 hover:bg-slate-100"
                 >
                     Anterior
                 </button>
                 <button 
                    onClick={() => table.nextPage()} 
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 rounded bg-white border border-slate-200 text-xs font-semibold disabled:opacity-50 hover:bg-slate-100"
                 >
                     Próxima
                 </button>
             </div>
        </div>
      </div>

    </div>
  );
};
