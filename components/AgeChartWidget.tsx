import React, { useMemo } from 'react';
import { CampaignData } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, YAxis, CartesianGrid } from 'recharts';
import { Users } from 'lucide-react';

interface Props {
  ads: CampaignData[];
}

interface AgeMetric {
  age: string;
  spend: number;
  leads: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const AgeChartWidget: React.FC<Props> = ({ ads }) => {

  const ageData = useMemo(() => {
    // Age Analysis (Simplified into bins)
    const bins: Record<string, AgeMetric> = ads.reduce((acc, curr) => {
        const bin = curr.target_idade_min ? `${curr.target_idade_min}-${curr.target_idade_max || '+'}` : 'N/A';
        if (!acc[bin]) {
        acc[bin] = { age: bin, spend: 0, leads: 0 };
        }
        acc[bin].spend += curr.valor_gasto;
        acc[bin].leads += (curr.msgs_iniciadas || 0); // Using msgs_iniciadas as Leads per standard
        return acc;
    }, {} as Record<string, AgeMetric>);
    
    return Object.values(bins)
        .map(d => ({ ...d, cpl: d.leads > 0 ? d.spend / d.leads : 0 }))
        .filter(d => d.spend > 0)
        .sort((a, b) => a.age.localeCompare(b.age)); // Sort by age bin string roughly
  }, [ads]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[500px] flex flex-col">
        <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Users size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">Performance por Idade</h3>
                <p className="text-xs text-slate-500">Custo por Lead (CPL) por faixa etária</p>
            </div>
        </div>

        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="age" 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={10} 
                    />
                    <YAxis 
                        tickFormatter={(val) => `R$${val}`} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [
                            formatCurrency(value), 
                            name === 'cpl' ? 'Custo por Lead' : name
                        ]}
                    />
                    <Bar 
                        dataKey="cpl" 
                        name="CPL"
                        fill="#3B82F6" 
                        radius={[6, 6, 0, 0]} 
                        barSize={40} 
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
            <p className="text-xs text-slate-400">Barras indicam o CPL. Quanto menor, mais eficiente.</p>
        </div>
    </div>
  );
};
