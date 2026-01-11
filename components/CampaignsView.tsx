import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import { buildCampaignHierarchy, HierarchyNode } from '../src/utils/dataAggregation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog, 
  DialogContent, 
  DialogTrigger, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  ChevronsRight, 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  Users, 
  Target, 
  TrendingUp,
  LayoutList,
  ImageIcon,
  Maximize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
}

export const CampaignsView: React.FC<Props> = ({ data }) => {
  const hierarchy = useMemo(() => buildCampaignHierarchy(data), [data]);
  
  // States for expansion
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  // Toggle handlers
  const toggleCampaign = (id: string) => {
    const next = new Set(expandedCampaigns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCampaigns(next);
  };

  const toggleAdSet = (id: string) => {
    const next = new Set(expandedAdSets);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedAdSets(next);
  };

  // KPI Calculation for the View Header
  const kpis = useMemo(() => {
    let spend = 0, leads = 0, revenue = 0;
    hierarchy.forEach(c => {
        spend += c.spend;
        leads += c.leads;
        revenue += c.purchases * 0; // TODO: Fix when revenue is available
    });
    const cpl = leads > 0 ? spend / leads : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    return { spend, leads, cpl, roas };
  }, [hierarchy]);

  // Expand Button Helper
  const ExpandBtn = ({ expanded, onClick, indent = false }: any) => (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("p-1 hover:bg-slate-200 rounded mr-2 transition-colors", indent && "ml-4")}
    >
      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header & KPIs */}
      <div className="flex flex-col gap-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Visão de Campanhas</h2>
            <p className="text-muted-foreground">Gerenciamento hierárquico de performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI_Card title="Investimento" value={kpis.spend} prefix="R$" icon={DollarSign} color="text-indigo-600" />
            <KPI_Card title="Leads" value={kpis.leads} icon={Users} color="text-orange-500" />
            <KPI_Card title="CPL" value={kpis.cpl} prefix="R$" icon={Target} color="text-emerald-600" />
            <KPI_Card title="ROAS" value={kpis.roas} suffix="x" icon={TrendingUp} color="text-blue-500" />
        </div>
      </div>

      {/* 2. Tree Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[400px]">Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchy.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        Sem dados para o período selecionado.
                    </TableCell>
                </TableRow>
            )}
            
            {hierarchy.map(campaign => (
                <React.Fragment key={campaign.id}>
                    {/* CAMPAIGN ROW */}
                    <TableRow className="hover:bg-muted/50 font-medium">
                        <TableCell className="flex items-center">
                            <ExpandBtn 
                                expanded={expandedCampaigns.has(campaign.id)} 
                                onClick={() => toggleCampaign(campaign.id)} 
                            />
                            <div className="flex flex-col">
                                <span className="text-sm">{campaign.name}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">Campanha</span>
                            </div>
                        </TableCell>
                        <TableCell><BadgeStatus status={campaign.status} /></TableCell>
                        <TableCell className="text-right">{fmtCurrency(campaign.spend)}</TableCell>
                        <TableCell className="text-right">{fmtNumber(campaign.impressions)}</TableCell>
                        <TableCell className="text-right">{campaign.ctr.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{campaign.leads}</TableCell>
                        <TableCell className="text-right">{fmtCurrency(campaign.cpl)}</TableCell>
                        <TableCell className="text-right">{campaign.roas.toFixed(2)}x</TableCell>
                    </TableRow>

                    {/* ADSETS ROWS */}
                    {expandedCampaigns.has(campaign.id) && campaign.children?.map(adset => (
                        <React.Fragment key={adset.id}>
                            <TableRow className="bg-muted/10 hover:bg-muted/20 text-sm">
                                <TableCell className="flex items-center pl-8">
                                    <ExpandBtn 
                                        expanded={expandedAdSets.has(adset.id)} 
                                        onClick={() => toggleAdSet(adset.id)} 
                                    />
                                    <div className="flex flex-col">
                                        <span className="truncate max-w-[250px]">{adset.name}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase">Conjunto</span>
                                    </div>
                                </TableCell>
                                <TableCell><BadgeStatus status={adset.status} size="sm"/></TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtCurrency(adset.spend)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtNumber(adset.impressions)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{adset.ctr.toFixed(2)}%</TableCell>
                                <TableCell className="text-right text-muted-foreground">{adset.leads}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{fmtCurrency(adset.cpl)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{adset.roas.toFixed(2)}x</TableCell>
                            </TableRow>

                            {/* ADS ROWS */}
                            {expandedAdSets.has(adset.id) && adset.children?.map(ad => (
                                <TableRow key={ad.id} className="bg-muted/5 hover:bg-muted/10 text-xs">
                                    <TableCell className="pl-16 py-2 truncate max-w-[300px] flex items-center">
                                        <div className="mr-3 flex-shrink-0">
                                            {ad.imageUrl ? (
                                                <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-md border border-border hover:opacity-80 transition-all group">
                                                    <img 
                                                        src={ad.imageUrl} 
                                                        alt={ad.name} 
                                                        className="h-full w-full object-cover" 
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Maximize2 className="h-3 w-3 text-white" />
                                                    </div>
                                                    </div>
                                                </DialogTrigger>
                                                
                                                <DialogContent className="max-w-screen-md border-none bg-transparent p-0 shadow-none text-center">
                                                    <div className="relative inline-block">
                                                    <img 
                                                        src={ad.imageUrl} 
                                                        alt={ad.name} 
                                                        className="max-h-[80vh] w-auto rounded-lg shadow-2xl border border-border/50 bg-background" 
                                                    />
                                                    <p className="mt-2 text-sm text-white/90 font-medium drop-shadow-md">{ad.name}</p>
                                                    </div>
                                                    <DialogTitle className="sr-only">Visualização do Criativo {ad.name}</DialogTitle>
                                                </DialogContent>
                                                </Dialog>
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="truncate">{ad.name}</span>
                                    </TableCell>
                                    <TableCell className="py-2"><BadgeStatus status={ad.status} size="xs" /></TableCell>
                                    <TableCell className="text-right py-2">{fmtCurrency(ad.spend)}</TableCell>
                                    <TableCell className="text-right py-2">{fmtNumber(ad.impressions)}</TableCell>
                                    <TableCell className="text-right py-2">{ad.ctr.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right py-2">{ad.leads}</TableCell>
                                    <TableCell className="text-right py-2">{fmtCurrency(ad.cpl)}</TableCell>
                                    <TableCell className="text-right py-2">{ad.roas.toFixed(2)}x</TableCell>
                                </TableRow>
                            ))}
                        </React.Fragment>
                    ))}
                </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// --- Helpers & Subcomponents ---

const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

const KPI_Card = ({ title, value, prefix, suffix, icon: Icon, color }: any) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={cn("h-4 w-4 text-muted-foreground", color)} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
                {prefix && <span className="text-sm font-normal text-muted-foreground mr-1">{prefix}</span>}
                {title === 'Leads' ? fmtNumber(value) : typeof value === 'number' && title !== 'ROAS' && !prefix ? fmtNumber(value) : value.toFixed(2)}
                {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </div>
        </CardContent>
    </Card>
);

const BadgeStatus = ({ status, size = 'default' }: { status: string, size?: 'default' | 'sm' | 'xs' }) => {
    const isSuccess = status === 'active' || status === 'ACTIVE';
    return (
        <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset",
            isSuccess ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-50 text-slate-600 ring-slate-500/10",
            size === 'xs' && "px-1 py-0.5 text-[10px]"
        )}>
            {isSuccess ? 'Ativo' : status}
        </span>
    );
};
