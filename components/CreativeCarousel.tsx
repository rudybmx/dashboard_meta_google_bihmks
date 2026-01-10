import React, { useState, useMemo } from 'react';
import { CampaignData } from '../types';
import { ChevronLeft, ChevronRight, AlertTriangle, Flame } from 'lucide-react';

interface Props {
  ads: CampaignData[];
}

export const CreativeCarousel: React.FC<Props> = ({ ads }) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Filter and Sort Logic
  const processedAds = useMemo(() => {
    return ads
      .filter(ad => ad.ad_image_url) // Only filter if URL is missing entirely
      .sort((a, b) => b.valor_gasto - a.valor_gasto);
  }, [ads]);

  const handleImageError = (url: string) => {
    setFailedImages(prev => {
      const newSet = new Set(prev);
        newSet.add(url);
        return newSet;
      });
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  const formatCompact = (val: number) => Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val).toLowerCase();
  const formatCompactPT = (val: number) => Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(val);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Matriz de Criativos
        </h3>
        <div className="flex gap-2">
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                <ChevronLeft size={16} />
            </button>
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                <ChevronRight size={16} />
            </button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {processedAds.map((ad, idx) => {
            const isSaturated = (ad.frequencia || 0) > 3.0;
            const isHighVol = ad.leads_total > 10;
            const key = ad.unique_id || idx;
            const isImageFailed = ad.ad_image_url && failedImages.has(ad.ad_image_url);

            return (
                <div 
                    key={key}
                    className="min-w-[280px] w-[280px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all shrink-0 snap-start"
                >
                    {/* Header (Image) */}
                    <div className="relative aspect-[4/5] bg-slate-100 flex items-center justify-center">
                        {!isImageFailed ? (
                            <img 
                                src={ad.ad_image_url} 
                                alt={ad.ad_title || 'Creative'} 
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(ad.ad_image_url!)}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                <AlertTriangle size={32} className="mb-2 opacity-50" />
                                <span className="text-xs font-medium">Imagem indisponível (AdBlock?)</span>
                            </div>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            {isSaturated && (
                                <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1">
                                    <AlertTriangle size={10} /> Saturado
                                </span>
                            )}
                            {isHighVol && (
                                <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1">
                                    <Flame size={10} /> High Vol
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-3 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5em] leading-snug" title={ad.ad_title}>
                            {ad.ad_title || 'Sem título'}
                        </p>
                    </div>

                    {/* Footer - Metric Grid */}
                    <div className="bg-slate-50 border-t border-slate-100 p-3 grid grid-cols-2 gap-2">
                        
                        {/* Inv */}
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Inv.</span>
                            <span className="text-xs font-semibold text-slate-700">{formatCurrency(ad.valor_gasto)}</span>
                        </div>

                        {/* Impr */}
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Impr.</span>
                            <span className="text-xs font-semibold text-slate-700">{formatCompactPT(ad.impressoes)}</span>
                        </div>

                        {/* Leads */}
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Leads</span>
                            <span className="text-sm font-bold text-indigo-600">{ad.leads_total}</span>
                        </div>

                        {/* Freq */}
                        <div className="flex flex-col">
                             <span className="text-[10px] uppercase text-slate-400 font-bold">Freq.</span>
                             <span className="text-xs font-semibold text-slate-700">{(ad.frequencia || 0).toFixed(2)}x</span>
                        </div>

                    </div>
                </div>
            );
        })}
        {processedAds.length === 0 && (
            <div className="w-full py-12 text-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum criativo disponível.
            </div>
        )}
      </div>
    </div>
  );
};
