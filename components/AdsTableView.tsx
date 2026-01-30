import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { SafeImage } from './ui/SafeImage';
import { 
  Search, 
  Download, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button-1";
import { cn } from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnResizeMode
} from '@tanstack/react-table';

interface Props {
  data: CampaignData[];
  onCampaignClick?: (campaignName: string) => void;
}

interface AdAggregated {
  ad_id: string;
  ad_name: string;
  ad_image_url?: string;
  ad_post_link?: string;
  adset_name: string; 
  campaign_name: string;
  objective: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  reach: number;
  cpl: number;
  ctr: number;
  cpm: number;
  frequency: number;
  roas: number;
}

// --- 1. Aggregation Helper ---
const aggregateAds = (data: CampaignData[]): AdAggregated[] => {
  const groups: Record<string, AdAggregated> = {};

  data.forEach(row => {
    const id = row.ad_id || row.unique_id;
    if (!groups[id]) {
      groups[id] = {
        ad_id: id,
        ad_name: row.ad_name || 'Desconhecido',
        ad_image_url: row.ad_image_url,
        ad_post_link: row.ad_post_link,
        adset_name: row.adset_name || '-',
        campaign_name: row.campaign_name || '-',
        objective: row.objective || 'Não definido',
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0,
        purchases: 0,
        purchaseValue: 0,
        reach: 0,
        cpl: 0, ctr: 0, cpm: 0, frequency: 0, roas: 0
      };
    }

    const g = groups[id];
    const spend = Number(row.valor_gasto || 0);
    g.spend += spend;
    g.leads += (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));
    g.impressions += Number(row.impressoes || 0);
    g.clicks += Number(row.cliques_todos || 0);
    g.purchases += Number(row.compras || 0);
    g.purchaseValue += Number(row.valor_compras || 0);
    g.reach += Number(row.alcance || 0);
  });

  return Object.values(groups).map(g => {
    // Derived Metrics
    g.cpl = g.leads > 0 ? g.spend / g.leads : 0;
    g.ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
    g.cpm = g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0;
    g.frequency = g.reach > 0 ? g.impressions / g.reach : 0;
    g.roas = g.spend > 0 ? g.purchaseValue / g.spend : 0;
    
    return g;
  }).sort((a, b) => b.spend - a.spend);
};

// --- Helper: CSV Export ---
const downloadCSV = (data: AdAggregated[]) => {
  const headers = [
    "Ad ID", "Nome Anúncio", "Objetivo", "Campanha",
    "Investimento", "Leads", "CPL", "CTR (%)", "CPM", "Freq"
  ];
  
  const csvContent = [
    headers.join(","),
    ...data.map(row => [
      `"${row.ad_id}"`,
      `"${row.ad_name.replace(/"/g, '""')}"`,
      `"${row.objective.replace(/"/g, '""')}"`,
      `"${row.campaign_name.replace(/"/g, '""')}"`,
      row.spend.toFixed(2),
      row.leads,
      row.cpl.toFixed(2),
      row.ctr.toFixed(2),
      row.cpm.toFixed(2),
      row.frequency.toFixed(2)
    ].join(","))
  ].join("\\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ads_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Formatters
const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);

// --- Column Helper ---
const columnHelper = createColumnHelper<AdAggregated>();

// --- Main Component ---
export const AdsTableView: React.FC<Props> = ({ data, onCampaignClick }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'spend', desc: true }]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [objectiveFilter, setObjectiveFilter] = useState<string>('');

  // 1. Process Data
  const tableData = useMemo(() => aggregateAds(data), [data]);

  // 1.5. Extract unique objectives for filter
  const uniqueObjectives = useMemo(() => {
    const objectives = new Set(tableData.map(ad => ad.objective));
    return Array.from(objectives).sort();
  }, [tableData]);

  // 1.6. Apply objective filter
  const filteredTableData = useMemo(() => {
    if (!objectiveFilter) return tableData;
    return tableData.filter(ad => ad.objective === objectiveFilter);
  }, [tableData, objectiveFilter]);

  // 2. Define Columns
  const columns = useMemo(() => [
    columnHelper.accessor('ad_image_url', {
      id: 'thumbnail',
      header: 'Criativo',
      cell: info => (
        <div className="group relative h-10 w-10 overflow-hidden rounded border border-slate-200 bg-slate-100 flex-shrink-0">
          <SafeImage 
            src={info.getValue()}
            fallbackIcon={<ImageIcon size={14} className="text-slate-300" />}
            fallbackText="!"
          />
          {info.getValue() && (
            <div className="hidden group-hover:block fixed z-50 ml-12 -mt-10 rounded-lg border-2 border-white shadow-xl w-[200px] h-auto overflow-hidden pointer-events-none bg-white">
              <SafeImage 
                src={info.getValue()}
                fallbackText="Imagem expirada na Meta"
                containerClassName="p-4"
              />
            </div>
          )}
        </div>
      ),
      enableSorting: false,
      enableResizing: false,
      size: 60,
      minSize: 60,
      maxSize: 60
    }),
    columnHelper.accessor('ad_name', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
          <span>Nome do Anúncio</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 line-clamp-1" title={info.getValue()}>
              {info.getValue()}
            </span>
            {info.row.original.ad_post_link && (
              <a href={info.row.original.ad_post_link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ID: {info.row.original.ad_id.slice(0,8)}...</span>
        </div>
      ),
      size: 250,
      minSize: 150
    }),
    columnHelper.accessor('objective', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
          <span>Objetivo</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => (
        <span className="text-xs text-slate-600 line-clamp-1" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
      size: 120,
      minSize: 100
    }),
    columnHelper.accessor('spend', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>Invest.</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => <div className="text-right font-medium text-slate-700">{fmtCurrency(info.getValue())}</div>,
      size: 100,
      minSize: 80
    }),
    columnHelper.accessor('leads', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>Leads</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => {
        const isAlert = info.getValue() === 0 && info.row.original.spend > 50;
        return (
          <div className={cn("text-right font-bold flex items-center justify-end gap-1", 
            isAlert ? "bg-red-50 text-red-700" : "text-blue-700"
          )}>
            {isAlert && <AlertCircle size={12} />}
            {info.getValue()}
          </div>
        );
      },
      size: 80,
      minSize: 60
    }),
    columnHelper.accessor('cpl', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>CPL</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => <div className="text-right text-slate-600">{fmtCurrency(info.getValue())}</div>,
      size: 90,
      minSize: 70
    }),
    columnHelper.accessor('ctr', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>CTR</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => (
        <div className={cn("text-right", info.getValue() > 2 ? "text-emerald-600 font-bold" : "text-slate-600")}>
          {info.getValue().toFixed(2)}%
        </div>
      ),
      size: 70,
      minSize: 60
    }),
    columnHelper.accessor('cpm', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>CPM</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => <div className="text-right text-slate-500 text-xs">{fmtCurrency(info.getValue())}</div>,
      size: 80,
      minSize: 70
    }),
    columnHelper.accessor('frequency', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => column.toggleSorting()}>
          <span>Freq.</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => <div className="text-right text-slate-500 text-xs">{info.getValue().toFixed(2)}</div>,
      size: 70,
      minSize: 60
    }),
    columnHelper.accessor('campaign_name', {
      header: ({ column }) => (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => column.toggleSorting()}>
          <span>Campanha</span>
          {column.getIsSorted() === 'asc' ? <ArrowUp size={14} /> : column.getIsSorted() === 'desc' ? <ArrowDown size={14} /> : <ArrowUpDown size={14} className="opacity-40" />}
        </div>
      ),
      cell: info => (
        <button
          onClick={() => onCampaignClick?.(info.getValue())}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[180px] text-left cursor-pointer"
          title={info.getValue()}
        >
          {info.getValue()}
        </button>
      ),
      size: 180,
      minSize: 120
    })
  ], [onCampaignClick]);

  // 3. Initialize Table
  const table = useReactTable({
    data: filteredTableData,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: true,
    columnResizeMode,
    initialState: {
      pagination: {
        pageSize: 20
      }
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-slate-900">Detalhamento de Anúncios</h2>
           <p className="text-slate-500">Tabela granular de performance por criativo.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Objective Filter */}
            <div className="w-[180px]">
                <select
                    value={objectiveFilter}
                    onChange={(e) => setObjectiveFilter(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Todos os Objetivos</option>
                    {uniqueObjectives.map(obj => (
                        <option key={obj} value={obj}>{obj}</option>
                    ))}
                </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar anúncio ou campanha..." 
                    className="pl-8 h-10" 
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />
            </div>
            <Button 
                variant="styled" 
                type="secondary" 
                className="h-10 px-4 gap-2"
                onClick={() => downloadCSV(table.getFilteredRowModel().rows.map(r => r.original))}
            >
                <div><Download size={16} /></div> <span>Exportar</span>
            </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden h-[calc(100vh-240px)]">
        <div className="h-[calc(100vh-300px)] overflow-auto relative">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize(), position: 'relative' }}
                      className="py-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 bg-slate-300 cursor-col-resize hover:bg-blue-500 transition-colors",
                            header.column.getIsResizing() && "bg-blue-500"
                          )}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    Nenhum anúncio encontrado.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr key={row.id} className={cn("hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="py-3 px-2"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {table.getPageCount() > 1 && (
            <div className="border-t bg-slate-50/50 p-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    Mostrando {table.getRowModel().rows.length} de {table.getFilteredRowModel().rows.length} resultados
                </span>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="unstyled" 
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
                    >
                        <span><ChevronLeft size={16} /></span>
                    </Button>
                    <span className="text-sm font-medium text-slate-700">
                        Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                    </span>
                    <Button 
                        variant="unstyled"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
                    >
                        <span><ChevronRight size={16} /></span>
                    </Button>
                </div>
            </div>
        )}
      </div>

    </div>
  );
};

export default AdsTableView;
