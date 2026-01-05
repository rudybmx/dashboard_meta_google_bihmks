import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { CampaignData } from '../types';

interface Props {
  data: CampaignData[];
}

export const MainCharts: React.FC<Props> = ({ data }) => {
  
  // Prepare Time Series Data
  const timeSeriesData = useMemo(() => {
    const grouped: Record<string, { date: string, spend: number, leads: number }> = {};
    
    // Sort chronologically first
    const sortedData = [...data].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    sortedData.forEach(d => {
      if (!grouped[d.date_start]) {
        grouped[d.date_start] = { date: d.date_start, spend: 0, leads: 0 };
      }
      grouped[d.date_start].spend += d.valor_gasto;
      grouped[d.date_start].leads += d.leads_total;
    });

    return Object.values(grouped).map(item => ({
        ...item,
        // format date for display
        displayDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));
  }, [data]);

  // Prepare Platform Data
  const platformData = useMemo(() => {
    const counts = { facebook: 0, google: 0, instagram: 0 };
    data.forEach(d => {
      // Map audience_network or others to generic if needed, or just handle main ones
      if (d.target_plataformas === 'facebook' || d.target_plataformas === 'instagram' || d.target_plataformas === 'google') {
          counts[d.target_plataformas] += d.valor_gasto;
      } else {
         // Fallback for audience network or others to facebook for visualization simplicity in this pie chart
         counts['facebook'] += d.valor_gasto;
      }
    });
    
    // Clean up data for chart
    const result = [
      { name: 'Facebook', value: counts.facebook, color: '#4F46E5' }, // Indigo 600
      { name: 'Instagram', value: counts.instagram, color: '#EC4899' }, // Pink 500
      { name: 'Google', value: counts.google, color: '#F97316' },   // Orange 500
    ].filter(item => item.value > 0);
    
    return result;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50">
          <p className="text-slate-500 text-xs font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-medium text-slate-700">
                {entry.name === 'Investment' ? 'Investimento' : entry.name === 'Leads' ? 'Leads' : entry.name}: {
                    entry.name === 'Investment' 
                    ? `R$ ${entry.value.toFixed(2)}` 
                    : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Main Area/Composed Chart */}
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">Investimento vs. Leads</h3>
          <p className="text-sm text-slate-500">Acompanhamento diário de performance.</p>
        </div>
        
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="displayDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val) => `R$${val}`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }} 
                formatter={(value) => value === 'Investment' ? 'Investimento' : 'Leads'}
              />
              
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="spend" 
                name="Investment" 
                stroke="#4F46E5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSpend)" 
              />
              <Bar 
                yAxisId="right"
                dataKey="leads" 
                name="Leads" 
                barSize={20} 
                fill="#F97316" 
                radius={[4, 4, 0, 0]} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-indigo-500/5 border border-slate-100 flex flex-col">
        <div className="mb-2">
            <h3 className="text-lg font-bold text-slate-900">Divisão por Plataforma</h3>
            <p className="text-sm text-slate-500">Distribuição de investimento.</p>
        </div>
        
        <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={platformData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                >
                {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
                </Pie>
                <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                />
            </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-xs text-slate-400 font-medium">Gasto Total</span>
            </div>
        </div>
      </div>

    </div>
  );
};