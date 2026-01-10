import React from 'react';

interface Props {
  investment: number;
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const Funnel3DWidget: React.FC<Props> = ({ investment, reach, impressions, clicks, leads }) => {
  // Calculations
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  // Conversion relative to previous stage
  const conversionLeads = clicks > 0 ? (leads / clicks) * 100 : 0;

  // Unit Costs (Investment / Quantity)
  const costPerReach = reach > 0 ? investment / reach : 0;
  const costPerImpression = impressions > 0 ? investment / impressions : 0;
  const costPerClick = clicks > 0 ? investment / clicks : 0;
  const costPerLead = leads > 0 ? investment / leads : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
        Funil de Conversão
      </h3>

      <div className="flex-1 flex flex-col justify-center gap-4 py-2">
        
        {/* Stage 1: Impressions */}
        <FunnelStage
          label="Impressões"
          count={impressions}
          conversion={100} // Base
          conversionLabel="Ref."
          unitCost={costPerImpression}
          width="w-full"
          colorClass="bg-blue-100 text-blue-800 border-blue-200"
          barColor="from-blue-200 to-blue-300"
          zIndex="z-40"
        />

        {/* Stage 2: Reach (Alcance) */}
        <FunnelStage
          label="Alcance"
          count={reach}
          conversion={impressions > 0 ? (reach / impressions) * 100 : 0}
          conversionLabel="Alc./Imp" 
          unitCost={costPerReach}
          width="w-[90%]"
          colorClass="bg-indigo-50 text-indigo-800 border-indigo-100"
          barColor="from-indigo-100 to-indigo-200"
          zIndex="z-30"
        />

        {/* Stage 2: Clicks */}
        <FunnelStage
          label="Cliques"
          count={clicks}
          conversion={ctr}
          conversionLabel="CTR"
          unitCost={costPerClick}
          width="w-[75%]"
          colorClass="bg-blue-500 text-white border-blue-600"
          barColor="from-blue-500 to-blue-600"
          zIndex="z-20"
        />

        {/* Stage 3: Leads */}
        <FunnelStage
          label="Leads"
          count={leads}
          conversion={conversionLeads}
          conversionLabel="Conv."
          unitCost={costPerLead}
          width="w-[60%]"
          colorClass="bg-indigo-600 text-white border-indigo-700"
          barColor="from-indigo-600 to-indigo-700"
          zIndex="z-10"
        />

      </div>
    </div>
  );
};

interface StageProps {
  label: string;
  count: number;
  conversion: number;
  conversionLabel: string;
  unitCost: number;
  width: string;
  colorClass: string;
  barColor: string;
  zIndex: string;
}

const FunnelStage: React.FC<StageProps> = ({ 
    label, count, conversion, conversionLabel, unitCost, width, colorClass, barColor, zIndex 
}) => {
  return (
    <div className={`relative flex items-center group ${zIndex}`}>
      
      {/* Visual Plate */}
      <div 
        className={`
            relative h-16 mx-auto rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-[1.02]
            bg-gradient-to-r ${barColor} ${width} border-b-4 border-black/10
        `}
      >
         <span className={`text-sm font-bold tracking-wide ${label === 'Impressões' ? 'text-blue-900' : 'text-white'}`}>
            {label}
         </span>
      </div>

      {/* Connection Line */}
      <div className="w-8 h-px bg-slate-200 mx-2 hidden md:block"></div>

      {/* Metrics Label */}
      <div className="hidden md:flex flex-col min-w-[140px]">
         <div className="flex items-baseline justify-between mb-1">
            <span className="text-base font-bold text-slate-800">{formatNumber(count)}</span>
            <span className="text-xs font-medium text-slate-400">Qtd</span>
         </div>
         <div className="flex items-baseline justify-between mb-1">
             <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {conversion.toFixed(conversionLabel === 'Ref.' ? 0 : 2)}%
             </span>
             <span className="text-[10px] uppercase text-slate-400">{conversionLabel}</span>
         </div>
         <div className="flex items-center justify-between pt-1 border-t border-slate-100">
             <span className="text-xs font-mono text-slate-600">{formatCurrency(unitCost)}</span>
             <span className="text-[10px] text-slate-400">/un</span>
         </div>
      </div>

    </div>
  );
};
