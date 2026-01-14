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
  Target,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ImageIcon,
  LayoutGrid,
  Megaphone
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  data: CampaignData[];
}

// --- Types ---
type SortDirection = 'asc' | 'desc';
type SortKey = 'spend' | 'leads' | 'cpl' | 'ctr' | 'cpc' | 'reach' | 'impressions' | 'roas';

interface TreeNode {
  id: string;
  name: string;
  level: 'campaign' | 'adset' | 'ad';
  image?: string; // Only for ads
  
  // Metrics
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchaseValue: number;
  
  // Computed
  cpl: number;
  ctr: number;
  cpc: number;
  roas: number;

  children: TreeNode[];
}

// --- Helper Functions ---

const createNode = (id: string, name: string, level: TreeNode['level'], image?: string): TreeNode => ({
  id,
  name,
  level,
  image,
  spend: 0,
  leads: 0,
  impressions: 0,
  clicks: 0,
  reach: 0,
  purchaseValue: 0,
  cpl: 0,
  ctr: 0,
  cpc: 0,
  roas: 0,
  children: []
});

const calculateCalculatedMetrics = (node: TreeNode) => {
  node.cpl = node.leads > 0 ? node.spend / node.leads : 0;
  node.ctr = node.impressions > 0 ? (node.clicks / node.impressions) * 100 : 0;
  node.cpc = node.clicks > 0 ? node.spend / node.clicks : 0;
  node.roas = node.spend > 0 ? node.purchaseValue / node.spend : 0;
};

const buildHierarchy = (data: CampaignData[]): TreeNode[] => {
  const campaignMap = new Map<string, TreeNode>();

  data.forEach(row => {
    // 1. Resolve Keys
    const campName = row.campaign_name || 'Sem Campanha';
    const campId = campName; // Using Name as ID for grouping consistency

    const adsetName = row.adset_name || 'Conjunto Geral';
    const adsetId = `${campId}_${adsetName}`;

    const adName = row.ad_name || 'Anúncio Geral';
    const adId = row.ad_id || `${adsetId}_${adName}_${Math.random()}`;

    // 2. Get or Create Campaign
    if (!campaignMap.has(campId)) {
        campaignMap.set(campId, createNode(campId, campName, 'campaign'));
    }
    const campNode = campaignMap.get(campId)!;

    // 3. Get or Create AdSet (Manual Search in children to avoid secondary map if list is small, matches Map approach above for scale)
    let adsetNode = campNode.children.find(c => c.id === adsetId);
    if (!adsetNode) {
        adsetNode = createNode(adsetId, adsetName, 'adset');
        campNode.children.push(adsetNode);
    }

    // 4. Create Ad Node (Always new leaf)
    const adNode = createNode(adId, adName, 'ad', row.ad_image_url);
    
    // 5. Populate Metrics (Leaf Level)
    adNode.spend = Number(row.valor_gasto || 0);
    adNode.leads = (Number(row.msgs_iniciadas || 0) + Number(row.compras || 0));
    adNode.impressions = Number(row.impressoes || 0);
    adNode.clicks = Number(row.cliques_todos || 0);
    adNode.reach = Number(row.alcance || 0);
    adNode.purchaseValue = Number(row.valor_compras || 0);
    calculateCalculatedMetrics(adNode);

    adsetNode.children.push(adNode);
  });

  // 6. Rollup Aggregation (Bottom-Up)
  campaignMap.forEach(campNode => {
      campNode.children.forEach(adsetNode => {
          // Sum AdSet children (Ads)
          adsetNode.children.forEach(ad => {
              adsetNode.spend += ad.spend;
              adsetNode.leads += ad.leads;
              adsetNode.impressions += ad.impressions;
              adsetNode.clicks += ad.clicks;
              adsetNode.reach += ad.reach; // Reach is usually non-additive, but strictly summing for hierarchy approx.
              adsetNode.purchaseValue += ad.purchaseValue;
          });
          calculateCalculatedMetrics(adsetNode);

          // Sum Campaign children (AdSets)
          campNode.spend += adsetNode.spend;
          campNode.leads += adsetNode.leads;
          campNode.impressions += adsetNode.impressions;
          campNode.clicks += adsetNode.clicks;
          campNode.reach += adsetNode.reach; // Again, approx.
          campNode.purchaseValue += adsetNode.purchaseValue;
      });
      calculateCalculatedMetrics(campNode);
  });

  return Array.from(campaignMap.values());
};

export const CampaignsView: React.FC<Props> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ 
      key: 'spend', 
      direction: 'desc' 
  });

  // Toggle Row Expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
        newExpanded.delete(id);
    } else {
        newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // --- Process Data ---
  const hierarchy = useMemo(() => {
    const rootNodes = buildHierarchy(data);
    
    // 1. Filter (Top Level Only for simplicity, or recursive search could be added)
    let filtered = rootNodes;
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = rootNodes.filter(n => 
            n.name.toLowerCase().includes(lowerTerm) || 
            n.children.some(c => c.name.toLowerCase().includes(lowerTerm))
        );
    }

    // 2. Sort (Top Level)
    filtered.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });

    return filtered;
  }, [data, searchTerm, sortConfig]);

  // Handle Sort Request
  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

  // Recursive Row Renderer
  const renderRow = (node: TreeNode) => {
    const isExpanded = expandedRows.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Styling based on level
    let bgClass = '';
    let plClass = 'pl-4';
    let icon = null;

    if (node.level === 'campaign') {
        bgClass = 'bg-white font-semibold border-b border-gray-100';
        plClass = 'pl-4';
        icon = <Megaphone size={16} className="text-indigo-600 mr-2" />;
    } else if (node.level === 'adset') {
        bgClass = 'bg-slate-50 border-b border-slate-100 text-sm';
        plClass = 'pl-12';
        icon = <LayoutGrid size={14} className="text-slate-500 mr-2" />;
    } else {
        bgClass = 'bg-white border-b border-slate-50 text-xs text-slate-600 hover:bg-yellow-50';
        plClass = 'pl-20';
        icon = node.image ? (
            <div className="relative h-8 w-8 mr-3 rounded overflow-hidden border border-slate-200 group-hover:scale-150 transition-transform origin-left z-10 bg-slate-100">
                <img src={node.image} alt="Creative" className="object-cover w-full h-full" />
            </div>
        ) : <ImageIcon size={14} className="text-slate-400 mr-2" />;
    }

    // Avg calculation for color coding
    const totalCpl = hierarchy.reduce((acc, n) => acc + (n.leads > 0 ? n.spend/n.leads : 0)*n.spend, 0) / hierarchy.reduce((acc, n) => acc + n.spend, 0) || 0; // Weighted Avg approx or just use global avg passed in props if available. 
    // Simplified: Just use node own CPL vs 50 (arbitrary) or heuristic? 
    // Let's stick to clean standard styling first.

    return (
        <React.Fragment key={node.id}>
            <TableRow className={cn("group transition-colors", bgClass)}>
                <TableCell className="py-2.5">
                    <div className={cn("flex items-center", plClass)}>
                        {/* Expand Toggle */}
                        {hasChildren ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleRow(node.id); }}
                                className="mr-2 p-1 hover:bg-black/5 rounded transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        ) : (
                            // Spacer for alignment if leaf
                           <span className="w-6 inline-block" /> 
                        )}
                        
                        {/* Icon/Image + Name */}
                        {icon}
                        <span className="truncate max-w-[300px]" title={node.name}>
                            {node.name}
                        </span>
                    </div>
                </TableCell>
                
                {/* Metrics */}
                <TableCell className="text-right py-2.5 text-indigo-700 font-medium tracking-tight">
                    {fmtCurrency(node.spend)}
                </TableCell>
                
                <TableCell className="text-right py-2.5 font-bold text-slate-800 bg-black/5">
                    {node.leads}
                </TableCell>
                
                <TableCell className="text-right py-2.5">
                     <Badge variant="outline" className={cn("font-mono font-medium", 
                        node.cpl === 0 ? "text-slate-400 border-slate-200" :
                        node.cpl < 40 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"
                     )}>
                        {fmtCurrency(node.cpl)}
                     </Badge>
                </TableCell>
                
                <TableCell className="text-right py-2.5 text-slate-600">
                    {node.ctr.toFixed(2)}%
                </TableCell>
                
                <TableCell className="text-right py-2.5 text-slate-600">
                    {fmtCurrency(node.cpc)}
                </TableCell>
                
                <TableCell className="text-right py-2.5 text-slate-500">
                    {fmtNumber(node.reach)}
                </TableCell>
            </TableRow>
            
            {/* Recursively render children if expanded */}
            {isExpanded && node.children.map(child => renderRow(child))}
        </React.Fragment>
    );
  };

  // Sort Header Helper
  const SortHead = ({ label, sortKey, alignRight = true }: { label: string, sortKey: SortKey, alignRight?: boolean }) => (
      <TableHead 
        className={cn(
            "cursor-pointer hover:bg-slate-100 transition-colors select-none group", 
            alignRight ? "text-right" : "text-left"
        )}
        onClick={() => handleSort(sortKey)}
      >
          <div className={cn("flex items-center gap-1", alignRight && "justify-end")}>
              {label}
              <ArrowUpDown size={12} className={cn("text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity", sortConfig.key === sortKey && "text-indigo-500 opacity-100")} />
          </div>
      </TableHead>
  );

  // --- Scatter Chart Data Preparation ---
  // Flatten for scatter chart (using only Campaigns)
  const scatterData = useMemo(() => hierarchy.map(n => ({
      name: n.name,
      spend: n.spend,
      cpl: n.cpl,
      leads: n.leads
  })), [hierarchy]);
   // Compute avg for RefLine
   const avgCpl = useMemo(() => {
    const totalSpend = hierarchy.reduce((acc, c) => acc + c.spend, 0);
    const totalLeads = hierarchy.reduce((acc, c) => acc + c.leads, 0);
    return totalLeads > 0 ? totalSpend / totalLeads : 0;
  }, [hierarchy]);


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 border-l-4 border-indigo-500 pl-4 py-1">
            Mesa de Performance
        </h2>
        <p className="text-slate-500 pl-5">Análise detalhada de eficiência e volume por hierarquia.</p>
      </div>

      {/* SECTION A: SCATTER CHART (Kept as requested or implicitly useful) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
            <Target className="h-5 w-5 text-indigo-600" />
            Matriz de Eficiência (Investimento vs. CPL)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis 
                  type="number" 
                  dataKey="spend" 
                  name="Investimento" 
                  unit="R$" 
                  tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`}
                  label={{ value: 'Investimento Total', position: 'bottom', offset: 0, fontSize: 12 }} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="cpl" 
                  name="CPL" 
                  unit="R$" 
                  tickFormatter={(val) => `${val}`}
                  label={{ value: 'Custo por Lead (CPL)', angle: -90, position: 'insideLeft', fontSize: 12 }} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                />
                <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white p-3 border border-slate-100 rounded-lg shadow-xl text-xs">
                                    <p className="font-bold mb-1 text-slate-800">{d.name}</p>
                                    <div className="space-y-1">
                                        <p className="text-indigo-600 font-medium">Invest.: {fmtCurrency(d.spend)}</p>
                                        <p className="text-emerald-600 font-medium">CPL: {fmtCurrency(d.cpl)}</p>
                                        <p className="text-slate-500">Leads: {d.leads}</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                
                {/* Reference Line: Avg CPL */}
                <ReferenceLine y={avgCpl} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5}>
                  <Label value={`CPL Médio: ${fmtCurrency(avgCpl)}`} position="insideTopRight" fill="#ef4444" fontSize={11}/>
                </ReferenceLine>

                <Scatter name="Campanhas" data={scatterData} fill="#6366f1" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECTION B: HIERARCHICAL TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                <LayoutGrid size={20} className="text-slate-400"/> Detalhamento Tático
            </h3>
            <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Filtrar campanhas, conjuntos, anúncios..." 
                    className="pl-9 bg-white border-slate-200 focus:border-indigo-500 shadow-sm" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-b border-slate-100">
                        <TableHead className="w-[400px] text-slate-500 font-medium">Estrutura (Campanha {'>'} Conjunto {'>'} Anúncio)</TableHead>
                        <SortHead label="Investimento" sortKey="spend" />
                        <SortHead label="Leads" sortKey="leads" />
                        <SortHead label="CPL" sortKey="cpl" />
                        <SortHead label="CTR" sortKey="ctr" />
                        <SortHead label="CPC" sortKey="cpc" />
                        <SortHead label="Alcance" sortKey="reach" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hierarchy.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                <div className="flex flex-col items-center gap-2">
                                    <Search size={24} className="opacity-20" />
                                    <span>Nenhum dado encontrado para o filtro atual.</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        hierarchy.map(node => renderRow(node))
                    )}
                </TableBody>
            </Table>
        </div>
      </div>

    </div>
  );
};
