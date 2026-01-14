import React, { useMemo } from 'react';
import { CampaignData } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { 
  MapPin, 
  Users, 
  Tags, 
  Globe2,
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
}

// --- Helper Functions ---

const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

const cleanLocationName = (name: string) => {
  if (!name) return 'Desconhecido';
  return name.replace(/\s*\(.*?\)/g, "").trim();
};

export const DemographicsGeoView: React.FC<Props> = ({ data }) => {

  // --- 1. Data Aggregation ---
  const { cityRanking, agePerformance, interestCloud, isEmpty } = useMemo(() => {
    
    const cityMap: Record<string, { name: string, spend: number, leads: number }> = {};
    const ageMap: Record<string, { range: string, spend: number, leads: number }> = {};
    const interestMap: Record<string, { tag: string, count: number, spend: number }> = {};

    let hasData = false;

    data.forEach(row => {
        // Validation: Valid Spend helps avoid ghost rows
        const spend = Number(row.valor_gasto || 0);
        const leads = (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));

        if (spend > 0 || leads > 0) hasData = true;

        // A. Location (Ranking)
        if (row.target_local_1) {
            const city = cleanLocationName(row.target_local_1);
            if (!cityMap[city]) cityMap[city] = { name: city, spend: 0, leads: 0 };
            cityMap[city].spend += spend;
            cityMap[city].leads += leads;
        }

        // B. Age Range
        // Construct Range Key
        let ageKey = "Desconhecido";
        if (row.target_idade_min && row.target_idade_max) {
             ageKey = `${row.target_idade_min}-${row.target_idade_max}`;
             if (row.target_idade_max >= 65) ageKey = `${row.target_idade_min}+`;
        } else if (row.target_idade_min) {
            ageKey = `${row.target_idade_min}+`;
        }

        if (!ageMap[ageKey]) ageMap[ageKey] = { range: ageKey, spend: 0, leads: 0 };
        ageMap[ageKey].spend += spend;
        ageMap[ageKey].leads += leads;

        // C. Interests (Text Mining)
        if (row.target_interesses) {
            const interests = row.target_interesses.split(',').map(s => s.trim()).filter(Boolean);
            const spendPerTag = interests.length > 0 ? spend / interests.length : 0; // Approximate attribution

            interests.forEach(tag => {
                if (!interestMap[tag]) interestMap[tag] = { tag, count: 0, spend: 0 };
                interestMap[tag].count += 1;
                interestMap[tag].spend += spendPerTag;
            });
        }
    });

    // Post-Process Lists

    // 1. Cities: Sort by Spend DESC, Take Top 10
    const cityRanking = Object.values(cityMap)
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 10);

    // 2. Age: Convert to Array, Calc CPL
    const agePerformance = Object.values(ageMap)
        .map(a => ({
            ...a,
            cpl: a.leads > 0 ? a.spend / a.leads : 0
        }))
        // Sort safely: try to parse min age
        .sort((a, b) => {
            const getMin = (s: string) => parseInt(s.split('-')[0].replace('+', '')) || 0;
            return getMin(a.range) - getMin(b.range);
        });

    // 3. Interests: Sort by Frequency (Count) DESC, Take Top 15
    const interestCloud = Object.values(interestMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 25); // Increased to 25 for better cloud cloud

    return { cityRanking, agePerformance, interestCloud, isEmpty: !hasData };

  }, [data]);


  if (isEmpty) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <Globe2 size={48} className="mb-4 opacity-50" />
            <h3 className="text-lg font-semibold">Sem dados demográficos</h3>
            <p>Não foi possível identificar informações de segmentação para o período selecionado.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inteligência de Público</h2>
        <p className="text-slate-500">
            Análise geográfica, demográfica e interesses comportamentais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WIDGET 1: TOP CITIES */}
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="text-indigo-500" size={18} />
                    Top Cidades por Investimento
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    {cityRanking.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                layout="vertical" 
                                data={cityRanking} 
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={100} 
                                    tick={{ fontSize: 11, fill: '#64748b' }} 
                                    interval={0}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                                    <p className="font-bold">{d.name}</p>
                                                    <p className="text-indigo-600">Gasto: {fmtCurrency(d.spend)}</p>
                                                    <p className="text-slate-600">Leads: {d.leads}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="spend" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            <AlertCircle size={16} className="mr-2" />
                            Segmentação geográfica aberta ou não disponível.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* WIDGET 2: AGE PERFORMANCE */}
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="text-emerald-500" size={18} />
                    Eficiência por Faixa Etária
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    {agePerformance.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={agePerformance} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                <XAxis dataKey="range" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" stroke="#10b981" fontSize={11} width={30} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} width={40} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                                <Tooltip 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 border rounded shadow-lg text-xs">
                                                    <p className="font-bold mb-1">Idade: {d.range}</p>
                                                    <p className="text-emerald-600">Leads: {d.leads}</p>
                                                    <p className="text-rose-600">CPL: {fmtCurrency(d.cpl)}</p>
                                                    <p className="text-slate-400 mt-1">Gasto: {fmtCurrency(d.spend)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                <Line yAxisId="right" type="monotone" dataKey="cpl" name="CPL" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            <AlertCircle size={16} className="mr-2" />
                            Idades não identificadas.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

      </div>

      {/* WIDGET 3: INTEREST CLOUD */}
      <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Tags className="text-blue-500" size={18} />
                    Interesses & Comportamentos (Top Utilizados)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {interestCloud.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2">
                        {interestCloud.map((tag, idx) => {
                            // Visual sizing logic
                            const isBig = idx < 5;
                            const isMedium = idx >= 5 && idx < 15;
                            
                            return (
                                <div 
                                    key={tag.tag}
                                    className={cn(
                                        "rounded-full px-3 py-1 font-medium text-slate-700 bg-slate-100 border border-slate-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all cursor-default group relative",
                                        isBig ? "text-sm px-4 py-1.5 bg-slate-200/50" : "text-xs",
                                        isMedium && "text-xs py-1.5"
                                    )}
                                    title={`Frequência: ${tag.count} | Gasto Est.: ${fmtCurrency(tag.spend)}`}
                                >
                                    {tag.tag}
                                    {/* Mini tooltip for spend on hover handled by title natively or custom CSS */}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
                        <AlertCircle size={16} className="mr-2" />
                        Nenhum interesse ou segmentação detalhada encontrada.
                    </div>
                )}
            </CardContent>
      </Card>

    </div>
  );
};
