import React from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WeeklyData {
  day: string;
  spend: number;
  leads: number;
}

interface Props {
  data: WeeklyData[];
}

export const WeeklyTrendsWidget: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
            Performance Semanal
        </h3>
        <p className="text-xs text-slate-500 font-medium ml-3.5">Investimento (Barras) vs Leads (Linha)</p>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                dy={10}
            />
            <YAxis 
                yAxisId="left" 
                orientation="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val)}
            />
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip 
                formatter={(value: number, name: string) => {
                    if (name === 'Investimento') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
                    return value;
                }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
            />
            <Bar 
                yAxisId="left" 
                dataKey="spend" 
                name="Investimento" 
                fill="#4f46e5" 
                barSize={32} 
                radius={[4, 4, 0, 0]} 
            />
            <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="leads" 
                name="Leads" 
                stroke="#38bdf8" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 6 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
