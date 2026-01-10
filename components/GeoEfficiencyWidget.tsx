import React, { useState, useMemo } from 'react';
import { CampaignData } from '../types';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { MapPin, Filter } from 'lucide-react';

interface Props {
  ads: CampaignData[];
}

interface WrapperStyles {
   style?: React.CSSProperties
}

// 1. Helper: Clean Location Name
const cleanLocationName = (rawName: string | undefined): string => {
  if (!rawName) return 'Sem Localização';
  
  // Check for Coordinates
  if (rawName.includes('Lat:') && rawName.includes('Long:')) {
    // Extract numbers usually formatting is "Lat: -18.923 Long: -46.992" or "Lat:-18.9.../Long:..."
    // Let's try to parse or just truncate.
    // Simple regex to grab numbers
    const matches = rawName.match(/Lat:([-0-9.]+).*Long:([-0-9.]+)/);
    if (matches && matches.length >= 3) {
      const lat = parseFloat(matches[1]).toFixed(1);
      const long = parseFloat(matches[2]).toFixed(1);
      return `📍 ${lat}, ${long}`;
    }
    return '📍 Pin (Coords)';
  }

  // Check for City Text - remove extra info like "(+20km)", ", Minas Gerais", ", Brasil"
  // Patrocínio, Minas Gerais (+20km) -> Patrocínio
  let cleaned = rawName.split('(')[0]; // Remove (+...)
  cleaned = cleaned.split(',')[0]; // Remove state/country after comma
  return cleaned.trim();
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const GeoEfficiencyWidget: React.FC<Props> = ({ ads }) => {
  const [activeMetric, setActiveMetric] = useState<'spend' | 'leads' | 'impressions' | 'cpl'>('leads');

  // 2. Data Processing
  const treeData = useMemo(() => {
    const map = new Map<string, { name: string; spend: number; leads: number; impressions: number }>();

    ads.forEach(ad => {
        const rawLoc = ad.target_local_1;
        const name = cleanLocationName(rawLoc);
        
        const current = map.get(name) || { name, spend: 0, leads: 0, impressions: 0 };
        
        map.set(name, {
            name,
            spend: current.spend + ad.valor_gasto,
            leads: current.leads + (ad.leads_total || 0) + (ad.msgs_iniciadas || 0), // Assuming broad definition or specific? 
            // Previous task defined "Leads" as msgs_iniciadas. I should probably stick to that or use leads_total? 
            // The user input generic "leads" in logic. Let's sum both or just usage msgs_iniciadas if that's the new standard. 
            // In the previous step I defined Leads = msgs_iniciadas. 
            // But CampaignData has leads_total too. I'll follow the "Leads = msgs_iniciadas" logic from ManagerialView if consistent, 
            // but here I only have the `ads` array. I'll use `ad.msgs_iniciadas` as primary "Leads" metric based on recent context.
            // Wait, looking at ManagerialView, I passed `leads={kpis.current.totalLeads}` which was `msgs_iniciadas`.
            // So here I will use `msgs_iniciadas`.
            impressions: current.impressions + ad.impressoes
        });
    });

    const items = Array.from(map.values()).map(item => {
        const cpl = item.leads > 0 ? item.spend / item.leads : 0;
        let value = 0;

        switch (activeMetric) {
            case 'spend': value = item.spend; break;
            case 'leads': value = item.leads; break;
            case 'impressions': value = item.impressions; break;
            case 'cpl': value = cpl; break;
        }

        return {
            ...item,
            cpl,
            value, // specific for Treemap sizing
        };
    }).filter(i => i.value > 0);

    return items.sort((a, b) => b.value - a.value); // Sort bigger to smaller for treemap
  }, [ads, activeMetric]);

  // 3. Color Scale Logic
  const maxValue = Math.max(...treeData.map(d => d.value));
  
  // Custom Cell Content
  const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, name, value, cpl } = props;
    
    // Dynamic Color
    // Simple interpolation logic or step?
    // Let's use opacity steps or HSL lightness.
    // Theme: Blue (#1e40af).
    // Min #e0f2fe (sky-100) -> Max #1e40af (blue-800)
    
    // Normalize value 0-1
    let ratio = maxValue > 0 ? value / maxValue : 0;
    
    // Inverse for CPL (Lower is better = Darker/Stronger? Or Standard?)
    // Request: "Inverse logic for CPL: Lower is darker (better), Higher is lighter (warning)"
    if (activeMetric === 'cpl') {
       // CPL logic: actually "Better" usually means good performance. 
       // If "Lower is darker", then Low CPL = Dark Blue. High CPL = Light.
       // The ratio logic: Smallest CPL should be 1.0 ratio, Largest 0.0.
       // Current ratio is based on value. So for CPL, Value = CPL. 
       // Small CPL (10) vs Large CPL (100). 
       // We want 10 -> Dark, 100 -> Light.
       // So we invert ratio? No, we invert the mapping.
       // Let's just calculate logic directly.
       const minCpl = Math.min(...treeData.map(d => d.cpl));
       const maxCpl = Math.max(...treeData.map(d => d.cpl));
       const range = maxCpl - minCpl;
       ratio = range > 0 ? 1 - ((value - minCpl) / range) : 1; 
    } else {
       // Standard: Higher value = Darker (More spend, more leads)
    }

    // Interpolate Blue Channel/Lightness
    // quick approximations: 
    // Light Blue: bg-sky-100 (RGB ~ 224, 242, 254)
    // Dark Blue: bg-blue-800 (RGB ~ 30, 64, 175)
    // Let's just use opacity on a dark base or classes if possible, but Recharts accepts specific fill string.
    // I'll produce a hex color.
    
    // Function to mix colors
    const colorMin = [224, 242, 254]; // #e0f2fe
    const colorMax = [30, 64, 175];   // #1e40af
    
    const r = Math.round(colorMin[0] + (colorMax[0] - colorMin[0]) * ratio);
    const g = Math.round(colorMin[1] + (colorMax[1] - colorMin[1]) * ratio);
    const b = Math.round(colorMin[2] + (colorMax[2] - colorMin[2]) * ratio);
    
    const fill = `rgb(${r}, ${g}, ${b})`;
    
    // Text Contrast
    // Simple luma check or default white for darker, dark for lighter
    // ratio > 0.5 ? white : slate-800
    const textColor = ratio > 0.4 ? '#ffffff' : '#1e293b';

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fill,
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 50 && height > 30 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            fill={textColor}
            fontSize={12}
            fontWeight={600}
            dy={-6}
          >
            {name}
          </text>
        )}
        {width > 50 && height > 30 && (
           <text
             x={x + width / 2}
             y={y + height / 2}
             textAnchor="middle"
             fill={textColor}
             fontSize={10}
             dy={8}
             opacity={0.8}
           >
             {activeMetric === 'cpl' || activeMetric === 'spend' 
                ? formatNumber(value) // formatting handling in parent? formatCurrency for spend/cpl
                : formatNumber(value)}
           </text>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <div className="bg-slate-800 text-white text-xs rounded-xl shadow-xl p-3 border border-slate-700">
                  <p className="font-bold mb-2 pb-2 border-b border-slate-700 flex items-center gap-1">
                      <MapPin size={12} className="text-sky-400"/> {data.name}
                  </p>
                  <p className="flex justify-between gap-4 mb-1">
                      <span className="text-slate-400">Investimento:</span>
                      <span className="font-mono">{formatCurrency(data.spend)}</span>
                  </p>
                  <p className="flex justify-between gap-4 mb-1">
                      <span className="text-slate-400">Leads:</span>
                      <span className="font-bold text-sky-400">{formatNumber(data.leads)}</span>
                  </p>
                  <p className="flex justify-between gap-4">
                      <span className="text-slate-400">CPL:</span>
                      <span className="font-mono">{formatCurrency(data.cpl)}</span>
                  </p>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
       
       {/* Header */}
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
           <div className="flex items-center gap-2">
               <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                   <MapPin size={20} />
               </div>
               <div>
                   <h3 className="text-lg font-bold text-slate-800">Eficiência Geográfica</h3>
                   <p className="text-xs text-slate-500">Performance por localização</p>
               </div>
           </div>
           
           {/* Metric Selector */}
           <div className="flex bg-slate-100 p-1 rounded-lg">
               {(['investimento', 'leads', 'impressoes', 'cpl'] as const).map(m => {
                   const mapLabel = {
                       'investimento': 'Invest.',
                       'leads': 'Leads',
                       'impressoes': 'Impr.',
                       'cpl': 'CPL'
                   };
                   const key = m === 'investimento' ? 'spend' : m === 'impressoes' ? 'impressions' : m;
                   const isActive = activeMetric === key;
                   return (
                       <button
                           key={m}
                           onClick={() => setActiveMetric(key as any)}
                           className={`
                               px-3 py-1.5 text-xs font-bold rounded-md transition-all
                               ${isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                           `}
                       >
                           {mapLabel[m]}
                       </button>
                   )
               })}
           </div>
       </div>

       {/* Treemap Visualization */}
       <div className="flex-1 w-full min-h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
               <Treemap
                   data={treeData}
                   dataKey="value"
                   aspectRatio={4/3}
                   stroke="#fff"
                   content={<CustomizedContent />}
                >
                   <Tooltip content={<CustomTooltip />} />
                </Treemap>
           </ResponsiveContainer>
       </div>
       
       <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-1">
            <span>* Área indica volume de {activeMetric === 'spend' ? 'investimento' : activeMetric}</span>
            <div className="flex items-center gap-2">
                <span>Min</span>
                <div className="w-16 h-2 rounded-full bg-gradient-to-r from-sky-100 to-blue-800"></div>
                <span>Max (Melhor Performance)</span>
            </div>
       </div>

    </div>
  );
};
