import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { SafeImage } from './ui/SafeImage';
import { Trophy, AlertCircle, Image as ImageIcon, ExternalLink, X, LayoutGrid, List, Search } from 'lucide-react';

import { Select } from "@/components/ui/select-1";
import { Button } from "@/components/ui/button-1";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
        ad_body: row.ad_body || '',
        adset_name: row.adset_name || '',
        ad_image_url: row.ad_image_url,
        ad_post_link: row.ad_post_link,
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
      };
    }

    // Sum Metrics
    groups[id].spend += Number(row.valor_gasto || 0);
    groups[id].leads += (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));
    groups[id].impressions += Number(row.impressoes || 0);
    groups[id].clicks += Number(row.cliques_todos || 0);
    groups[id].reach += Number(row.alcance || 0);
  });

  // Calculate Metrics
  return Object.values(groups).map(g => {
    const cpl = g.leads > 0 ? g.spend / g.leads : 0;
    const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
    // Frequency: Impressions / Reach (Basic approximation)
    const frequency = g.reach > 0 ? g.impressions / g.reach : 1;
    
    return { ...g, cpl, ctr, frequency };
  });
};

export const CreativesView: React.FC<Props> = ({ data }) => {
  const [sortOption, setSortOption] = useState('spend');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process Data
  const creatives = useMemo(() => aggregateCreatives(data).filter(c => c.ad_image_url), [data]);

  // 2. Global Stats for Badges
  const { avgCpl } = useMemo(() => {
    const totalSpend = creatives.reduce((acc, c) => acc + c.spend, 0);
    const totalLeads = creatives.reduce((acc, c) => acc + c.leads, 0);
    return {
      avgCpl: totalLeads > 0 ? totalSpend / totalLeads : 0
    };
  }, [creatives]);

  // 3. Filter by search query
  const filteredCreatives = useMemo(() => {
    if (!searchQuery) return creatives;
    
    const query = searchQuery.toLowerCase();
    return creatives.filter(c => 
      (c.ad_name?.toLowerCase().includes(query)) ||
      (c.ad_title?.toLowerCase().includes(query)) ||
      (c.adset_name?.toLowerCase().includes(query))
    );
  }, [creatives, searchQuery]);

  // 4. Sort
  const sortedCreatives = useMemo(() => {
    let result = [...filteredCreatives];

    result.sort((a, b) => {
      if (sortOption === 'spend') return b.spend - a.spend;
      if (sortOption === 'leads') return b.leads - a.leads;
      if (sortOption === 'cpl') return (a.cpl || 9999) - (b.cpl || 9999);
      if (sortOption === 'ctr') return b.ctr - a.ctr;
      return 0;
    });

    return result;
  }, [filteredCreatives, sortOption]);

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Badge Logic Helper
  const getBadge = (ad: any) => {
    if (ad.leads > 3 && ad.cpl < avgCpl) {
      return <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><Trophy size={10} /> Ganhador</span>;
    } else if (ad.frequency > 4) {
      return <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><AlertCircle size={10} /> Saturado</span>;
    } else if (ad.spend > 100 && ad.leads === 0) {
      return <span className="bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1"><AlertCircle size={10} /> Sem Leads</span>;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Performance Criativa</h2>
          <p className="text-slate-500">Análise visual de anúncios e criativos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou conjunto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 h-10 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
                title="Visualização em Grade"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
                title="Visualização em Lista"
              >
                <List size={18} />
              </button>
            </div>

            {/* Sort Dropdown */}
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

      {/* Display */}
      {sortedCreatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ImageIcon className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhum criativo encontrado</h3>
            <p className="text-slate-500">Tente ajustar os filtros ou selecionar outro período.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedCreatives.map((ad) => (
                <div key={ad.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                    
                    {/* Image Header - ASPECT SQUARE 1:1 */}
                    <div className="relative aspect-square bg-slate-100 overflow-hidden rounded-t-xl group/img">
                        <div className="w-full h-full cursor-pointer" onClick={() => ad.ad_image_url && setSelectedImage(ad.ad_image_url)}>
                            <SafeImage 
                                src={ad.ad_image_url}
                                alt={ad.ad_name}
                                className="object-cover w-full h-full transition-transform hover:scale-105 duration-300"
                                fallbackIcon={<ImageIcon size={32} />}
                                fallbackText={ad.ad_image_url ? "Imagem Expirada na Meta" : "Sem Imagem"}
                            />
                        </div>
                        
                        <div className="absolute top-3 left-3 z-10">{getBadge(ad)}</div>

                        {/* External Link Overlay */}
                        {ad.ad_post_link && (
                            <a 
                                href={ad.ad_post_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition-colors z-20 backdrop-blur-sm"
                                title="Ver post original"
                            >
                                <ExternalLink size={14} />
                            </a>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                            <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{ad.ad_title || ad.ad_name}</p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 mb-0.5" title={ad.ad_title}>
                            {ad.ad_title || "Anúncio sem título"}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono truncate mb-1">{ad.ad_name}</p>
                        
                        {/* Adset Name */}
                        {ad.adset_name && (
                            <p className="text-[10px] text-slate-400 italic truncate mb-2" title={ad.adset_name}>
                                {ad.adset_name}
                            </p>
                        )}
                        
                        {/* Ad Body */}
                        {ad.ad_body && (
                            <div className="mb-4" title={ad.ad_body}>
                                <p className="text-[10px] text-slate-600 leading-tight line-clamp-5 h-[50px] overflow-hidden">
                                    {ad.ad_body}
                                </p>
                            </div>
                        )}
                        
                        <div className="mt-auto grid grid-cols-2 gap-y-3 gap-x-2 border-t pt-3">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Investimento</p>
                                <p className="text-sm font-semibold text-slate-900">{fmtCurrency(ad.spend)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Leads</p>
                                <p className="text-sm font-bold text-blue-600">{ad.leads}</p>
                            </div>
                            
                            <div className="border-t pt-2 mt-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CPL</p>
                                <p className={cn("text-sm font-bold", ad.cpl < avgCpl ? "text-emerald-600" : "text-rose-600")}>
                                    {fmtCurrency(ad.cpl)}
                                </p>
                            </div>
                            <div className="border-t pt-2 mt-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CTR</p>
                                <p className="text-sm font-semibold text-slate-700">{ad.ctr.toFixed(2)}%</p>
                            </div>

                            <div className="col-span-2 border-t pt-2 mt-1">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Frequência</p>
                                <p className="text-sm font-semibold text-slate-700">{ad.frequency.toFixed(2)}x</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
            {sortedCreatives.map((ad) => (
                <div key={ad.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex gap-4 p-4">
                    
                    {/* Image - Larger in List View */}
                    <div className="relative w-48 h-36 bg-slate-100 overflow-hidden rounded-lg flex-shrink-0">
                        <div className="w-full h-full cursor-pointer" onClick={() => ad.ad_image_url && setSelectedImage(ad.ad_image_url)}>
                            <SafeImage 
                                src={ad.ad_image_url}
                                alt={ad.ad_name}
                                className="object-cover w-full h-full transition-transform hover:scale-105 duration-300"
                                fallbackIcon={<ImageIcon size={32} />}
                                fallbackText={ad.ad_image_url ? "Imagem Expirada na Meta" : "Sem Imagem"}
                            />
                        </div>
                        
                        <div className="absolute top-2 left-2 z-10">{getBadge(ad)}</div>

                        {ad.ad_post_link && (
                            <a 
                                href={ad.ad_post_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition-colors z-20 backdrop-blur-sm"
                                title="Ver post original"
                            >
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 line-clamp-1 mb-1" title={ad.ad_title}>
                                {ad.ad_title || "Anúncio sem título"}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono truncate mb-1">{ad.ad_name}</p>
                            
                            {/* Adset Name */}
                            {ad.adset_name && (
                                <p className="text-xs text-slate-400 italic truncate mb-2" title={ad.adset_name}>
                                    {ad.adset_name}
                                </p>
                            )}
                            
                            {/* Ad Body */}
                            {ad.ad_body && (
                                <div className="mb-3" title={ad.ad_body}>
                                    <p className="text-xs text-slate-600 leading-tight line-clamp-5 h-[60px] overflow-hidden">
                                        {ad.ad_body}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Investimento</p>
                                <p className="text-sm font-semibold text-slate-900">{fmtCurrency(ad.spend)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Leads</p>
                                <p className="text-sm font-bold text-blue-600">{ad.leads}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CPL</p>
                                <p className={cn("text-sm font-bold", ad.cpl < avgCpl ? "text-emerald-600" : "text-rose-600")}>
                                    {fmtCurrency(ad.cpl)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CTR</p>
                                <p className="text-sm font-semibold text-slate-700">{ad.ctr.toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Frequência</p>
                                <p className="text-sm font-semibold text-slate-700">{ad.frequency.toFixed(2)}x</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
            <div className="relative group w-full h-full flex items-center justify-center">
                <img 
                    src={selectedImage || ''} 
                    alt="Lightbox" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors bg-white/10 p-2 rounded-full backdrop-blur-md"
                >
                    <X size={24} />
                </button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreativesView;
