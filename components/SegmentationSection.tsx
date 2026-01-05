import React from 'react';
import { CampaignData } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Props {
  data: CampaignData[];
}

interface GeoMetric {
  city: string;
  spend: number;
  leads: number;
}

interface AgeMetric {
  age: string;
  spend: number;
  leads: number;
}

export const SegmentationSection: React.FC<Props> = ({ data }) => {
  
  // 1. Geography Analysis
  const geoData: Record<string, GeoMetric> = data.reduce((acc, curr) => {
    const city = curr.target_local_1 || 'Desconhecido';
    if (!acc[city]) {
      acc[city] = { city, spend: 0, leads: 0 };
    }
    acc[city].spend += curr.valor_gasto;
    acc[city].leads += (curr.leads_total + (curr.msgs_novos_contatos || 0));
    return acc;
  }, {} as Record<string, GeoMetric>);

  const geoChartData = Object.values(geoData)
    .map(d => ({
      ...d,
      cpl: d.leads > 0 ? d.spend / d.leads : 0
    }))
    .filter(d => d.spend > 0)
    .sort((a, b) => a.cpl - b.cpl) // Sort by cheapest CPL
    .slice(0, 5);

  // 2. Age Analysis (Simplified into bins)
  const ageData: Record<string, AgeMetric> = data.reduce((acc, curr) => {
    const bin = curr.target_idade_min ? `${curr.target_idade_min}-${curr.target_idade_max || '+'}` : 'N/A';
    if (!acc[bin]) {
      acc[bin] = { age: bin, spend: 0, leads: 0 };
    }
    acc[bin].spend += curr.valor_gasto;
    acc[bin].leads += (curr.leads_total + (curr.msgs_novos_contatos || 0));
    return acc;
  }, {} as Record<string, AgeMetric>);
  
  const ageChartData = Object.values(ageData)
     .map(d => ({ ...d, cpl: d.leads > 0 ? d.spend / d.leads : 0 }))
     .filter(d => d.spend > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Geography */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Eficiência Geográfica</h3>
        <div className="h-[250px] w-full">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={geoChartData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="city" type="category" width={100} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    formatter={(value: number, name: string) => [
                        name === 'cpl' ? `R$ ${value.toFixed(2)}` : value, 
                        name === 'cpl' ? 'Custo por Lead' : name
                    ]}
                />
                <Bar dataKey="cpl" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} name="cpl" />
            </BarChart>
           </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">Cidades com menor CPL (Custo por Lead)</p>
      </div>

      {/* Age Radar/Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Radar de Idade (CPL)</h3>
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData}>
                    <XAxis dataKey="age" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    />
                    <Bar dataKey="cpl" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">Custo por Lead por faixa etária</p>
      </div>
    </div>
  );
};