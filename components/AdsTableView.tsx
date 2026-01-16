import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { 
  Search, 
  Download, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button-1";
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
}

interface AdAggregated {
  ad_id: string;
  ad_name: string;
  ad_image_url?: string;
  ad_post_link?: string;
  adset_name: string; 
  campaign_name: string;
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
  status: 'active' | 'inactive';
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
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0,
        purchases: 0,
        purchaseValue: 0,
        reach: 0,
        cpl: 0, ctr: 0, cpm: 0, frequency: 0, roas: 0,
        status: 'inactive'
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

    if (spend > 0) g.status = 'active';
  });

  return Object.values(groups).map(g => {
    // Derived Metrics
    g.cpl = g.leads > 0 ? g.spend / g.leads : 0;
    g.ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
    g.cpm = g.impressions > 0 ? (g.spend / g.impressions) * 1000 : 0;
    // Frequency approximation (Impressions / Reach) or Average if available
    g.frequency = g.reach > 0 ? g.impressions / g.reach : 0;
    g.roas = g.spend > 0 ? g.purchaseValue / g.spend : 0;
    
    return g;
  }).sort((a, b) => b.spend - a.spend);
};

// --- Helper: CSV Export ---
const downloadCSV = (data: AdAggregated[]) => {
  const headers = [
    "Ad ID", "Nome Anúncio", "Campanha", "Status", 
    "Investimento", "Leads", "CPL", "CTR (%)", "CPM", "Freq"
  ];
  
  const csvContent = [
    headers.join(","),
    ...data.map(row => [
      `"${row.ad_id}"`,
      `"${row.ad_name.replace(/"/g, '""')}"`,
      `"${row.campaign_name.replace(/"/g, '""')}"`,
      row.status,
      row.spend.toFixed(2),
      row.leads,
      row.cpl.toFixed(2),
      row.ctr.toFixed(2),
      row.cpm.toFixed(2),
      row.frequency.toFixed(2)
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `ads_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Main Component ---
export const AdsTableView: React.FC<Props> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 1. Process Data
  const allAds = useMemo(() => aggregateAds(data), [data]);

  // 2. Filter
  const filteredAds = useMemo(() => {
    if (!searchTerm) return allAds;
    const lower = searchTerm.toLowerCase();
    return allAds.filter(ad => 
      ad.ad_name.toLowerCase().includes(lower) || 
      ad.campaign_name.toLowerCase().includes(lower)
    );
  }, [allAds, searchTerm]);

  // 3. Paginate
  const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
  const paginatedAds = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAds.slice(start, start + itemsPerPage);
  }, [filteredAds, currentPage]);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-slate-900">Detalhamento de Anúncios</h2>
           <p className="text-slate-500">Tabela granular de performance por criativo.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar anúncio ou campanha..." 
                    className="pl-8 h-10" 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset page on search
                    }}
                />
            </div>
            <Button 
                variant="styled" 
                type="secondary" 
                className="h-10 px-4 gap-2"
                onClick={() => downloadCSV(filteredAds)}
            >
                <div><Download size={16} /></div> <span>Exportar</span>
            </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto relative">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                    <TableHead className="w-[60px]">Criativo</TableHead>
                    <TableHead className="w-[300px]">Nome do Anúncio</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="text-right">Investimento</TableHead>
                    <TableHead className="text-right font-bold text-blue-700">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">Freq.</TableHead>
                    <TableHead className="w-[200px]">Campanha</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedAds.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                            Nenhum anúncio encontrado.
                        </TableCell>
                    </TableRow>
                ) : (
                    paginatedAds.map((ad, idx) => (
                        <TableRow key={ad.ad_id} className={cn("hover:bg-slate-50/80 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                            
                            {/* 1. Thumbnail */}
                            <TableCell>
                                <div className="group relative h-10 w-10 overflow-hidden rounded border border-slate-200 bg-slate-100 flex-shrink-0">
                                    {ad.ad_image_url ? (
                                        <>
                                            <img 
                                                src={ad.ad_image_url} 
                                                alt="" 
                                                className="h-full w-full object-cover" 
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                }}
                                            />
                                            <div className="hidden group-hover:block fixed z-50 ml-12 -mt-10 rounded-lg border-2 border-white shadow-xl w-[200px] h-auto overflow-hidden pointer-events-none bg-white">
                                                 <img 
                                                    src={ad.ad_image_url} 
                                                    alt="" 
                                                    className="w-full h-auto" 
                                                    onError={(e) => {
                                                        const parent = e.currentTarget.parentElement;
                                                        if (parent) parent.style.display = 'none';
                                                    }}
                                                 />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <ImageIcon className="h-4 w-4 text-slate-300" />
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            {/* 2. Name & Link */}
                            <TableCell>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900 line-clamp-1" title={ad.ad_name}>
                                            {ad.ad_name}
                                        </span>
                                        {ad.ad_post_link && (
                                            <a href={ad.ad_post_link} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {ad.ad_id.slice(0,8)}...</span>
                                </div>
                            </TableCell>

                            {/* 3. Status */}
                            <TableCell>
                                <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                    ad.status === 'active' ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-1 ring-slate-500/20"
                                )}>
                                    {ad.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </TableCell>

                            {/* 4. Spend */}
                            <TableCell className="text-right font-medium text-slate-700">
                                {fmtCurrency(ad.spend)}
                            </TableCell>

                            {/* 5. Leads (Visual Cue) */}
                            <TableCell className={cn("text-right font-bold", 
                                (ad.leads === 0 && ad.spend > 50) ? "bg-red-50 text-red-700" : "text-blue-700"
                            )}>
                                <div className="flex items-center justify-end gap-1">
                                    {(ad.leads === 0 && ad.spend > 50) && <AlertCircle size={12} />}
                                    {ad.leads}
                                </div>
                            </TableCell>

                            {/* 6. CPL */}
                            <TableCell className="text-right text-slate-600">
                                {fmtCurrency(ad.cpl)}
                            </TableCell>

                            {/* 7. CTR (Visual Cue) */}
                            <TableCell className={cn("text-right", ad.ctr > 2 ? "text-emerald-600 font-bold" : "text-slate-600")}>
                                {ad.ctr.toFixed(2)}%
                            </TableCell>

                            {/* 8. CPM */}
                            <TableCell className="text-right text-slate-500 text-xs">
                                {fmtCurrency(ad.cpm)}
                            </TableCell>

                             {/* 9. Frequency */}
                             <TableCell className="text-right text-slate-500 text-xs">
                                {ad.frequency.toFixed(2)}
                            </TableCell>

                            {/* 10. Campaign */}
                            <TableCell className="text-xs text-slate-500 truncate max-w-[180px]" title={ad.campaign_name}>
                                {ad.campaign_name}
                            </TableCell>

                        </TableRow>
                    ))
                )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        {filteredAds.length > itemsPerPage && (
            <div className="border-t bg-slate-50/50 p-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    Mostrando {paginatedAds.length} de {filteredAds.length} resultados
                </span>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="unstyled" 
                        disabled={currentPage === 1}
                        onClick={() => goToPage(currentPage - 1)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
                    >
                        <span><ChevronLeft size={16} /></span>
                    </Button>
                    <span className="text-sm font-medium text-slate-700">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button 
                        variant="unstyled"
                        disabled={currentPage === totalPages}
                        onClick={() => goToPage(currentPage + 1)}
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
