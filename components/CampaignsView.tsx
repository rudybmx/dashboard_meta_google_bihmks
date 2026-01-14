import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';
import { 
  Search, 
  TrendingUp, 
  Target
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
}

// --- 1. Aggregation Helper ---
const aggregateCampaigns = (data: CampaignData[]) => {
  const groups: Record<string, any> = {};

  data.forEach(row => {
    const name = row.campaign_name || 'Desconhecido';
    if (!groups[name]) {
      groups[name] = {
        name,
        spend: 0,
        leads: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        purchaseValue: 0,
        status: 'paused' // Default, will update
      };
    }

    // Aggregation
    groups[name].spend += Number(row.valor_gasto || 0);
    // LEADS = msgs_iniciadas + compras
    groups[name].leads += (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));
    groups[name].impressions += Number(row.impressoes || 0);
    groups[name].clicks += Number(row.cliques_todos || 0);
    groups[name].reach += Number(row.alcance || 0);
    // Handle optional valor_compras
    groups[name].purchaseValue += Number(row.valor_compras || 0); 

    // Status Logic: If any row has spend > 0, consider campaign active
    if (Number(row.valor_gasto) > 0) {
      groups[name].status = 'active';
    }
  });

  // Calculations
  return Object.values(groups).map(g => {
    const cpl = g.leads > 0 ? g.spend / g.leads : 0;
    const ctr = g.impressions > 0 ? (g.clicks / g.impressions) * 100 : 0;
    const cpc = g.clicks > 0 ? g.spend / g.clicks : 0;
    const roas = g.spend > 0 ? g.purchaseValue / g.spend : 0;

    return { ...g, cpl, ctr, cpc, roas };
  }).sort((a, b) => b.spend - a.spend); // Default Sort by Spend
};

export const CampaignsView: React.FC<Props> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Memoized Data
  const campaigns = useMemo(() => aggregateCampaigns(data), [data]);
  
  // Account Average CPL for Reference Line
  const avgCpl = useMemo(() => {
    const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
    const totalLeads = campaigns.reduce((acc, c) => acc + c.leads, 0);
    return totalLeads > 0 ? totalSpend / totalLeads : 0;
  }, [campaigns]);

  // Filtered List
  const filteredCampaigns = useMemo(() => {
    if (!searchTerm) return campaigns;
    return campaigns.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [campaigns, searchTerm]);

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg text-xs">
          <p className="font-bold mb-1">{data.name}</p>
          <p className="text-indigo-600">Investimento: {fmtCurrency(data.spend)}</p>
          <p className="text-emerald-600">CPL: {fmtCurrency(data.cpl)}</p>
          <p className="text-gray-500">Leads: {data.leads}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Performance de Campanhas</h2>
        <p className="text-muted-foreground">Análise tática de eficiência e volume.</p>
      </div>

      {/* SECTION A: SCATTER CHART */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Eficiência: Investimento vs. CPL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  type="number" 
                  dataKey="spend" 
                  name="Investimento" 
                  unit="R$" 
                  tickFormatter={(val) => `R$${val/1000}k`}
                  label={{ value: 'Investimento Total', position: 'bottom', offset: 0 }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="cpl" 
                  name="CPL" 
                  unit="R$" 
                  tickFormatter={(val) => `R$${val}`}
                  label={{ value: 'Custo por Lead (CPL)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                
                {/* Reference Line: Avg CPL */}
                <ReferenceLine y={avgCpl} stroke="red" strokeDasharray="3 3">
                  <Label value={`CPL Médio: ${fmtCurrency(avgCpl)}`} position="insideTopRight" fill="red" fontSize={12}/>
                </ReferenceLine>

                <Scatter name="Campanhas" data={campaigns} fill="#6366f1" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECTION B: DETAILED TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp size={20} /> Detalhamento
            </h3>
            <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar campanha..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[300px]">Campanha</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Investimento</TableHead>
                        <TableHead className="text-right font-bold text-black">Leads</TableHead>
                        <TableHead className="text-right">CPL</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">Alcance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCampaigns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                Nenhuma campanha encontrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredCampaigns.map((c) => (
                            <TableRow key={c.name} className="hover:bg-muted/50">
                                <TableCell className="font-medium truncate max-w-[300px]" title={c.name}>
                                    {c.name}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("h-2 w-2 rounded-full", c.status === 'active' ? "bg-emerald-500" : "bg-slate-300")} />
                                        <span className="text-xs text-muted-foreground capitalize">{c.status === 'active' ? 'Ativo' : 'Pausado'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-indigo-600 font-medium">{fmtCurrency(c.spend)}</TableCell>
                                <TableCell className="text-right font-bold bg-slate-50">{c.leads}</TableCell>
                                <TableCell className="text-right">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-xs font-medium",
                                        c.cpl < avgCpl ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                    )}>
                                        {fmtCurrency(c.cpl)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">{c.ctr.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{fmtCurrency(c.cpc)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtNumber(c.reach)}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

    </div>
  );
};
