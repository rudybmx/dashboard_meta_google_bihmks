

import React from 'react';

interface Props {
  investment: number;
  impressions: number;
  clicks: number;
  leads: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
const formatPercent = (val: number) => `${val.toFixed(2)}%`;

export const FunnelSection: React.FC<Props> = ({ investment, impressions, clicks, leads }) => {
  
  // Calculations
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (leads / clicks) : 0; // Keeping as ratio for display or % ? User asked for %. Let's do leads/clicks %
  const cvrPercent = clicks > 0 ? (leads / clicks) * 100 : 0;

  // Unit Costs
  // Formula: investment / quantity of that stage
  // Wait, User asked for "Unit Cost (Calculated): The investment divided by the quantity of that stage."
  // Usually CPM is inv/imp * 1000, but user said "Unit Cost". I will follow formula: inv / quantity.
  
  const costPerImpression = impressions > 0 ? investment / impressions : 0;
  // Usually this is tiny, so maybe display CPM? 
  // User example: "R$ 10,00 / click". 
  // Let's stick to the requested formula.
  
  const costPerClick = clicks > 0 ? investment / clicks : 0;
  const costPerLead = leads > 0 ? investment / leads : 0;

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl overflow-hidden relative">
       {/* Background Glow */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>

       <h3 className="text-xl font-bold text-white mb-8 relative z-10 flex items-center gap-2">
         <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
         Funil de Conversão 3D
       </h3>

       <div className="flex flex-col gap-2 relative z-10 max-w-4xl mx-auto">
         
         {/* STAGE 1: IMPRESSIONS */}
         <FunnelStage 
            label="Impressões"
            quantity={impressions}
            width="w-[100%]"
            gradient="from-slate-700 to-slate-600"
            shadow="shadow-slate-900/50"
            zIndex="z-30"
            color="text-slate-200"
            metrics={{
                conversionLabel: "Ref. Base",
                conversionValue: "100%",
                unitCost: costPerImpression
            }}
         />

         {/* STAGE 2: CLICKS */}
         <FunnelStage 
            label="Cliques no Link"
            quantity={clicks}
            width="w-[75%]"
            gradient="from-indigo-600 to-indigo-500"
            shadow="shadow-indigo-900/50"
            zIndex="z-20"
            color="text-white"
            metrics={{
                conversionLabel: "CTR (Conv.)",
                conversionValue: formatPercent(ctr),
                unitCost: costPerClick
            }}
         />

         {/* STAGE 3: LEADS */}
         <FunnelStage 
            label="Leads"
            quantity={leads}
            width="w-[50%]"
            gradient="from-sky-500 to-cyan-400"
            shadow="shadow-sky-900/50"
            zIndex="z-10"
            color="text-white"
            metrics={{
                conversionLabel: "Taxa Conv.",
                conversionValue: formatPercent(cvrPercent),
                unitCost: costPerLead
            }}
         />

       </div>
    </div>
  );
};

interface StageProps {
    label: string;
    quantity: number;
    width: string;
    gradient: string;
    shadow: string;
    zIndex: string;
    color: string;
    metrics: {
        conversionLabel: string;
        conversionValue: string;
        unitCost: number;
    }
}

const FunnelStage: React.FC<StageProps> = ({ label, quantity, width, gradient, shadow, zIndex, metrics, color }) => {
    return (
        <div className={`flex items-center group ${zIndex}`}>
            {/* The 3D Plate */}
            <div className={`
                relative h-24 mx-auto rounded-2xl flex items-center justify-center transition-all duration-500 hover:scale-[1.02]
                bg-gradient-to-r ${gradient} shadow-2xl ${shadow} ${width}
                border-t border-white/20 border-b border-black/20
            `}>
                {/* 3D Depth Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/10 pointer-events-none rounded-2xl"></div>
                
                <div className="flex flex-col items-center text-center drop-shadow-md">
                    <span className={`text-sm font-bold uppercase tracking-wider opacity-90 mb-1 ${color}`}>{label}</span>
                    <span className={`text-3xl font-black tracking-tight ${color}`}>{formatNumber(quantity)}</span>
                </div>
            </div>

            {/* Connection Line */}
            <div className="hidden md:flex w-12 h-px bg-slate-700 mx-4 relative shrink-0">
                <div className="absolute right-0 w-2 h-2 rounded-full bg-slate-500 -mt-1"></div>
            </div>

            {/* Detail Card (Right Side) */}
            <div className="hidden md:flex flex-col w-48 bg-slate-800/80 border border-slate-700 rounded-xl p-3 backdrop-blur-sm shrink-0 hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Qtd.</span>
                    <span className="text-sm font-bold text-white">{formatNumber(quantity)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase text-indigo-400 font-semibold">{metrics.conversionLabel}</span>
                    <span className="text-sm font-bold text-indigo-300">{metrics.conversionValue}</span>
                </div>
                <div className="h-px bg-slate-700/50 my-1"></div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Custo Un.</span>
                    <span className="text-xs font-mono text-emerald-400">{formatCurrency(metrics.unitCost)}</span>
                </div>
            </div>
        </div>
    );
};