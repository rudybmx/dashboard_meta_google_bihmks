import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter,
  Image as ImageIcon,
  MoreVertical,
  LayoutGrid,
  AlertCircle,
  Trophy
} from 'lucide-react';

import { Select } from "@/components/ui/select-1";
import { Button } from "@/components/ui/button-1";
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
}

// --- 1. Aggregation Helper ---
const aggregateCreatives = (data: CampaignData[]) => {
  const groups: Record<string, any> = {};

  data.forEach(row => {
    // Group by Ad ID
    const id = row.ad_id || row.unique_id; 
    
    if (!groups[id]) {
      groups[id] = {
        id,
        ad_name: row.ad_name || 'Desconhecido',
        ad_title: row.ad_title || '',
        ad_image_url: row.ad_image_url,
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        purchaseValue: 0
      };
    }

    // Sum Metrics
    groups[id].spend += Number(row.valor_gasto || 0);
    groups[id].leads += (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));
    groups[id].impressions += Number(row.impressoes || 0);
    groups[id].clicks += Number(row.cliques_todos || 0);
    groups[id].reach += Number(row.alcance || 0); // Taking sum of reach, though sometimes max is better
  });

  // Calculate Metrics
  return Object.values(groups).map(g => {
    const cpl = g.leads > 0 ? g.spend / g.leads : 0;
    const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
    // Frequency: Impressions / Reach (Basic approximation)
    const frequency = g.reach > 0 ? g.impressions / g.reach : 0;
    
    return { ...g, cpl, ctr, frequency };
  });
};

export const CreativesView: React.FC<Props> = ({ data }) => {
  const [filterImageOnly, setFilterImageOnly] = useState(true);
  const [sortOption, setSortOption] = useState('spend'); // spend, leads, cpl, ctr

  // 1. Process Data
  const creatives = useMemo(() => aggregateCreatives(data), [data]);

  // 2. Global Stas for Badges
  const { avgCpl } = useMemo(() => {
    const totalSpend = creatives.reduce((acc, c) => acc + c.spend, 0);
    const totalLeads = creatives.reduce((acc, c) => acc + c.leads, 0);
    return {
      avgCpl: totalLeads > 0 ? totalSpend / totalLeads : 0
    };
  }, [creatives]);

  // 3. Filter & Sort
  const filteredAndSorted = useMemo(() => {
    let result = [...creatives];

    if (filterImageOnly) {
      result = result.filter(c => c.ad_image_url);
    }

    result.sort((a, b) => {
      if (sortOption === 'spend') return b.spend - a.spend;
      if (sortOption === 'leads') return b.leads - a.leads;
      if (sortOption === 'cpl') return (a.cpl || 9999) - (b.cpl || 9999);
      if (sortOption === 'ctr') return b.ctr - a.ctr;
      return 0;
    });

    return result;
  }, [creatives, filterImageOnly, sortOption]);

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Performance Criativa</h2>
          <p className="text-slate-500">Análise visual de anúncios e criativos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <Button 
                variant={filterImageOnly ? "styled" : "unstyled"}
                type={filterImageOnly ? "primary" : "secondary"}
                className={cn("h-10 text-xs px-4", !filterImageOnly && "bg-white border text-slate-600")}
                onClick={() => setFilterImageOnly(!filterImageOnly)}
            >
                <ImageIcon size={16} className="mr-2" />
                {filterImageOnly ? "Com Imagem" : "Mostrar Todos"}
            </Button>

            <div className="w-[180px]">
                <Select
                    value={sortOption}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOption(e.target.value)}
                    options={[
                        { value: 'spend', label: 'Maior Gasto' },
                        { value: 'leads', label: 'Mais Leads' },
                        { value: 'cpl', label: 'Menor CPL' },
                        { value: 'ctr', label: 'Maior CTR' },
                    ]}
                />
            </div>
        </div>
      </div>

      {/* Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum criativo encontrado</h3>
            <p className="text-slate-500">Tente ajustar os filtros ou selecionar outro período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSorted.map((ad) => {
                // Badge Logic
                let Badge = null;
                if (ad.leads > 3 && ad.cpl < avgCpl) {
                    Badge = <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><Trophy size={10} /> Ganhador</span>;
                } else if (ad.frequency > 4) {
                    Badge = <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><AlertCircle size={10} /> Saturado</span>;
                } else if (ad.spend > 100 && ad.leads === 0) {
                    Badge = <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><AlertCircle size={10} /> Sem Leads</span>;
                }

                return (
                    <div key={ad.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                        
                        {/* Image Header */}
                        <div className="relative h-48 bg-slate-100 overflow-hidden">
                            {ad.ad_image_url ? (
                                <img 
                                    src={ad.ad_image_url} 
                                    alt={ad.ad_name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <ImageIcon size={32} />
                                    <span className="text-xs mt-2">Sem Imagem</span>
                                </div>
                            )}
                            {Badge}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                <p className="text-white text-xs font-medium line-clamp-2">{ad.ad_title || ad.ad_name}</p>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1" title={ad.ad_title}>
                                {ad.ad_title || "Anúncio sem título"}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-mono truncate mb-4">{ad.ad_name}</p>
                            
                            <div className="mt-auto grid grid-cols-2 gap-y-3 gap-x-2 border-t pt-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Investimento</p>
                                    <p className="text-sm font-medium text-slate-900">{fmtCurrency(ad.spend)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Leads</p>
                                    <p className="text-sm font-bold text-blue-600">{ad.leads}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">CPL</p>
                                    <p className={cn("text-sm font-medium", ad.cpl < avgCpl ? "text-emerald-600" : "text-rose-600")}>
                                        {fmtCurrency(ad.cpl)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-semibold">CTR</p>
                                    <p className="text-sm font-medium text-slate-700">{ad.ctr.toFixed(2)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};
