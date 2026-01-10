import React, { useState } from 'react';
import { CampaignData } from '../types';
import { ExternalLink, Image as ImageIcon, ZoomIn, X } from 'lucide-react';

interface Props {
  data: CampaignData[];
}

interface CreativeMetric {
  image?: string;
  title: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  post_link?: string;
}

// Subcomponent to handle individual image state
const CreativeCard: React.FC<{ 
  creative: CreativeMetric, 
  onClickImage: (url: string) => void 
}> = ({ creative, onClickImage }) => {
  const [imgError, setImgError] = useState(false);
  
  const cpl = creative.leads > 0 ? creative.spend / creative.leads : 0;
  const ctr = creative.impressions > 0 ? (creative.clicks / creative.impressions) * 100 : 0;
  const isExpensive = cpl > 20;

  const handleImageClick = () => {
    if (creative.image && !imgError) {
      onClickImage(creative.image);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 group hover:shadow-lg transition-all duration-300 flex flex-col h-full">
      <div 
        className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-200 cursor-pointer group/img"
        onClick={handleImageClick}
      >
        {creative.image && !imgError ? (
           <>
             <img 
               src={creative.image} 
               alt={creative.title} 
               onError={() => setImgError(true)}
               className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" 
             />
             <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                <ZoomIn className="text-white opacity-0 group-hover/img:opacity-100 transform scale-75 group-hover/img:scale-100 transition-all drop-shadow-md" size={32} />
             </div>
           </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <ImageIcon size={24} />
                <span className="text-[10px] font-medium">Sem imagem</span>
            </div>
        )}
        
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-md shadow-sm ${isExpensive ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
            {isExpensive ? 'CPL Alto' : 'Ótimo'}
        </div>
      </div>
      
      <h4 className="text-xs font-bold text-slate-800 mb-2 truncate" title={creative.title}>
        {creative.title}
      </h4>

      <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[10px] mb-3">
        <div className="text-slate-500">Gasto</div>
        <div className="text-right font-medium text-slate-900">R$ {creative.spend.toFixed(0)}</div>
        
        <div className="text-slate-500">CPL</div>
        <div className={`text-right font-bold ${isExpensive ? 'text-red-600' : 'text-emerald-600'}`}>
            R$ {cpl.toFixed(2)}
        </div>

        <div className="text-slate-500">CTR</div>
        <div className="text-right font-medium text-slate-900">{ctr.toFixed(1)}%</div>
      </div>

      <div className="mt-auto pt-3 border-t border-slate-200 flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
        {creative.post_link ? (
            <a 
              href={creative.post_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
            >
               Ver Anúncio <ExternalLink size={10} />
            </a>
        ) : (
            <span className="text-[10px] text-slate-400 italic">Sem link</span>
        )}
      </div>
    </div>
  );
};

export const CreativeMatrix: React.FC<Props> = ({ data }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Group metrics by creative (approximated by ad_title + ad_image_url)
  const groupedCreatives: Record<string, CreativeMetric> = data.reduce((acc, curr) => {
    const key = curr.ad_image_url || 'no-image';
    if (!acc[key]) {
      acc[key] = {
        image: curr.ad_image_url,
        title: curr.ad_title || 'Anúncio sem título',
        post_link: curr.ad_post_link, // Capture the permalink
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0
      };
    }
    acc[key].spend += curr.valor_gasto;
    acc[key].leads += (curr.leads_total + (curr.msgs_novos_contatos || 0)); // Blended leads
    acc[key].impressions += curr.impressoes;
    acc[key].clicks += curr.cliques_todos;
    
    // Fallback: If current row has permalink but stored one doesn't, update it
    if (!acc[key].post_link && curr.ad_post_link) {
        acc[key].post_link = curr.ad_post_link;
    }

    return acc;
  }, {} as Record<string, CreativeMetric>);

  const creatives = Object.values(groupedCreatives)
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend) // Sort by spend descending
    .slice(0, 6); // Top 6

  return (
    <>
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Matriz de Criativos</h3>
                    <p className="text-sm text-slate-500">Top performance por imagem.</p>
                </div>
                <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Ver Todos</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {creatives.map((creative, idx) => (
                    <CreativeCard 
                        key={idx} 
                        creative={creative} 
                        onClickImage={setSelectedImage} 
                    />
                ))}
            </div>
        </div>

        {/* Modal Lightbox */}
        {selectedImage && (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                onClick={() => setSelectedImage(null)}
            >
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
                <div 
                    className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <img 
                        src={selectedImage} 
                        alt="Preview" 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            </div>
        )}
    </>
  );
};