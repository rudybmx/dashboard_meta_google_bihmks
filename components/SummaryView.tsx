import React, { useEffect, useMemo, useState } from 'react';
import { CampaignData, MetaAdAccount } from '../types';
import { fetchMetaAccounts } from '../services/supabaseService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Props {
  data: CampaignData[];
  selectedFranchisee: string; 
  selectedClient: string;
}

interface AggregatedAccountStats {
  account_name: string;
  spend: number;
  purchases: number;
  conversations: number;
  results: number;
  clicks: number;
  impressions: number;
  reach: number;
  cpl: number;
  ctr: number;
  cpc: number;
}

interface MergedAccountData extends MetaAdAccount {
  period_stats: AggregatedAccountStats;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const SummaryView: React.FC<Props> = ({ data, selectedFranchisee, selectedClient }) => {
  const [metaAccounts, setMetaAccounts] = useState<MetaAdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'spend', direction: 'desc' });

  // 1. Fetch Meta Accounts (Live Status & Balance)
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accounts = await fetchMetaAccounts();
        setMetaAccounts(accounts);
      } catch (error) {
        console.error("Failed to fetch meta accounts", error);
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, []);

  // 2. Aggregate Performance Data by Account Name
  const performanceMap = useMemo(() => {
    const groups: Record<string, AggregatedAccountStats> = {};

    data.forEach(row => {
      const name = row.account_name;
      if (!name) return;

      if (!groups[name]) {
        groups[name] = {
          account_name: name,
          spend: 0,
          purchases: 0,
          conversations: 0,
          results: 0,
          clicks: 0,
          impressions: 0,
          reach: 0,
          cpl: 0, ctr: 0, cpc: 0
        };
      }

      groups[name].spend += Number(row.valor_gasto || 0);
      groups[name].purchases += Number(row.compras || 0);
      groups[name].conversations += Number(row.msgs_iniciadas || 0);
      groups[name].clicks += Number(row.cliques_todos || 0);
      groups[name].impressions += Number(row.impressoes || 0);
      groups[name].reach += Number(row.alcance || 0); 
    });

    return Object.entries(groups).reduce((acc, [key, stats]) => {
      stats.results = stats.purchases + stats.conversations;
      stats.cpl = stats.results > 0 ? stats.spend / stats.results : 0;
      stats.ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
      stats.cpc = stats.clicks > 0 ? stats.spend / stats.clicks : 0;
      acc[key] = stats;
      return acc;
    }, {} as Record<string, AggregatedAccountStats>);

  }, [data]);

  // 3. Merge & Filter Lists
  const baseData = useMemo(() => {
    if (loading) return [];
    
    const filteredMetaAccounts = metaAccounts.filter(acc => {
       const matchFranchise = !selectedFranchisee || acc.franchise_id === selectedFranchisee;
       const matchClient = !selectedClient || (acc.account_name === selectedClient || acc.display_name === selectedClient);
       return matchFranchise && matchClient;
    });

    return filteredMetaAccounts.map(acc => {
      const perf = performanceMap[acc.account_name] || 
                   performanceMap[acc.display_name || ''] || 
                   { 
                     spend: 0, purchases: 0, conversations: 0, results: 0, 
                     clicks: 0, impressions: 0, reach: 0, cpl: 0, ctr: 0, cpc: 0 
                   };

      return {
        ...acc,
        period_stats: perf
      };
    });
  }, [metaAccounts, performanceMap, loading, selectedFranchisee, selectedClient]);

  // 4. Calculate Totals (Memoized over baseData)
  const totals = useMemo(() => {
    const t = {
        count: baseData.length,
        spend: 0,
        purchases: 0,
        conversations: 0,
        results: 0,
        clicks: 0,
        impressions: 0,
        reach: 0,
        totalGastoLife: 0,
        saldo: 0,
        avgCpl: 0,
        avgCtr: 0,
        avgCpc: 0
    };

    baseData.forEach(acc => {
        t.spend += acc.period_stats.spend;
        t.purchases += acc.period_stats.purchases;
        t.conversations += acc.period_stats.conversations;
        t.results += acc.period_stats.results;
        t.clicks += acc.period_stats.clicks;
        t.impressions += acc.period_stats.impressions;
        t.reach += acc.period_stats.reach;
        t.totalGastoLife += acc.total_gasto || 0;
        t.saldo += acc.current_balance || 0;
    });

    // Weighted Averages
    t.avgCpl = t.results > 0 ? t.spend / t.results : 0;
    t.avgCtr = t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0;
    t.avgCpc = t.clicks > 0 ? t.spend / t.clicks : 0;

    return t;
  }, [baseData]);

  // 5. Sort Data
  const sortedData = useMemo(() => {
    if (!sortConfig) return baseData;

    return [...baseData].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      // Determine Sort Value based on key
      switch (sortConfig.key) {
        case 'account_name': 
            valA = a.display_name || a.account_name;
            valB = b.display_name || b.account_name;
            break;
        case 'spend':
            valA = a.period_stats.spend;
            valB = b.period_stats.spend;
            break;
        case 'purchases':
            valA = a.period_stats.purchases;
            valB = b.period_stats.purchases;
            break;
        case 'conversations':
            valA = a.period_stats.conversations;
            valB = b.period_stats.conversations;
            break;
        case 'results':
            valA = a.period_stats.results;
            valB = b.period_stats.results;
            break;
        case 'cpl':
            valA = a.period_stats.cpl;
            valB = b.period_stats.cpl;
            break;
        case 'ctr':
            valA = a.period_stats.ctr;
            valB = b.period_stats.ctr;
            break;
        case 'cpc':
            valA = a.period_stats.cpc;
            valB = b.period_stats.cpc;
            break;
        case 'reach':
            valA = a.period_stats.reach;
            valB = b.period_stats.reach;
            break;
        case 'total_gasto':
            valA = a.total_gasto || 0;
            valB = b.total_gasto || 0;
            break;
        case 'current_balance':
            valA = a.current_balance || 0;
            valB = b.current_balance || 0;
            break;
        case 'status':
            valA = a.status_meta === 'ACTIVE' ? 1 : 0;
            valB = b.status_meta === 'ACTIVE' ? 1 : 0;
            break;
        default:
            return 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [baseData, sortConfig]);

  // Sorting Handler
  const requestSort = (key: string) => {
    let direction: SortDirection = 'desc'; // Default desc for metrics
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
     if (sortConfig?.key !== colKey) return <ArrowUpDown size={12} className="text-slate-300 ml-1 opacity-50" />;
     return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600 ml-1" /> : <ArrowDown size={12} className="text-blue-600 ml-1" />;
  };

  // Formatters
  const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const fmtInt = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const fmtPct = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val) + '%';

  if (loading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div>
         <h2 className="text-2xl font-bold tracking-tight text-slate-900">Resumo Gerencial</h2>
         <p className="text-slate-500">Visão consolidada de todas as contas e sua performance no período.</p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                    <TableHead className="w-[250px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('account_name')}>
                        <div className="flex items-center">Nome da Conta <SortIcon colKey="account_name"/></div>
                    </TableHead>
                    <TableHead className="text-right bg-blue-50/50 text-blue-900 font-semibold cursor-pointer hover:bg-blue-100/50" onClick={() => requestSort('spend')}>
                        <div className="flex items-center justify-end">Investimento <SortIcon colKey="spend"/></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('purchases')}>
                        <div className="flex items-center justify-end">Compras <SortIcon colKey="purchases"/></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('conversations')}>
                        <div className="flex items-center justify-end">Conversas <SortIcon colKey="conversations"/></div>
                    </TableHead>
                    <TableHead className="text-right bg-blue-50/50 text-blue-900 font-semibold cursor-pointer hover:bg-blue-100/50" onClick={() => requestSort('results')}>
                        <div className="flex items-center justify-end">Resultado <SortIcon colKey="results"/></div>
                    </TableHead>
                    <TableHead className="text-right bg-blue-50/50 text-blue-900 font-semibold cursor-pointer hover:bg-blue-100/50" onClick={() => requestSort('cpl')}>
                        <div className="flex items-center justify-end">CPL <SortIcon colKey="cpl"/></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('ctr')}>
                        <div className="flex items-center justify-end">CTR <SortIcon colKey="ctr"/></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('cpc')}>
                        <div className="flex items-center justify-end">CPC <SortIcon colKey="cpc"/></div>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer hover:bg-slate-100" onClick={() => requestSort('reach')}>
                        <div className="flex items-center justify-end">Alcance <SortIcon colKey="reach"/></div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-slate-100" onClick={() => requestSort('status')}>Status Conta</TableHead>
                    <TableHead className="text-right text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('total_gasto')}>
                        <div className="flex items-center justify-end">Total Gasto (Life) <SortIcon colKey="total_gasto"/></div>
                    </TableHead>
                    <TableHead className="text-right font-medium text-emerald-700 cursor-pointer hover:bg-slate-100" onClick={() => requestSort('current_balance')}>
                        <div className="flex items-center justify-end">Saldo Atual <SortIcon colKey="current_balance"/></div>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedData.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">Nenhuma conta encontrada para os filtros selecionados.</TableCell>
                    </TableRow>
                ) : (
                    sortedData.map((row) => (
                        <TableRow key={row.account_id} className="hover:bg-slate-50">
                            <TableCell className="font-bold text-slate-800">
                                {row.display_name || row.account_name}
                                <div className="text-[10px] text-slate-400 font-normal font-mono">{row.account_id}</div>
                            </TableCell>
                            
                            <TableCell className="text-right bg-blue-50/30 font-medium text-slate-900">
                                {fmtCurrency(row.period_stats.spend)}
                            </TableCell>
                            
                            <TableCell className="text-right">{fmtInt(row.period_stats.purchases)}</TableCell>
                            <TableCell className="text-right">{fmtInt(row.period_stats.conversations)}</TableCell>
                            
                            <TableCell className="text-right bg-blue-50/30 font-bold text-blue-700">
                                {fmtInt(row.period_stats.results)}
                            </TableCell>
                            
                            <TableCell className="text-right bg-blue-50/30 font-medium text-slate-900">
                                {fmtCurrency(row.period_stats.cpl)}
                            </TableCell>
                            
                            <TableCell className="text-right text-slate-600">{fmtPct(row.period_stats.ctr)}</TableCell>
                            <TableCell className="text-right text-slate-600">{fmtCurrency(row.period_stats.cpc)}</TableCell>
                            <TableCell className="text-right text-slate-600 text-xs">{fmtInt(row.period_stats.reach)}</TableCell>
                            
                            <TableCell className="text-center">
                                {row.status_meta && row.status_meta !== 'ACTIVE' ? (
                                    <Badge variant="destructive" className="whitespace-nowrap flex items-center gap-1 justify-center max-w-[120px] mx-auto">
                                        <AlertCircle size={10} />
                                        {row.motivo_bloqueio || 'Bloqueado'}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Ativo
                                    </Badge>
                                )}
                            </TableCell>
                            
                            <TableCell className="text-right text-slate-400 text-xs">
                                {fmtCurrency(row.total_gasto || 0)}
                            </TableCell>
                            
                            <TableCell className={cn("text-right font-bold", row.current_balance < 100 ? "text-red-600" : "text-emerald-700")}>
                                {fmtCurrency(row.current_balance)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
            <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <TableRow>
                     <TableCell className="text-slate-900">{totals.count} Clientes</TableCell>
                     <TableCell className="text-right bg-blue-100/50 text-blue-900">{fmtCurrency(totals.spend)}</TableCell>
                     <TableCell className="text-right text-slate-900">{fmtInt(totals.purchases)}</TableCell>
                     <TableCell className="text-right text-slate-900">{fmtInt(totals.conversations)}</TableCell>
                     <TableCell className="text-right bg-blue-100/50 text-blue-900">{fmtInt(totals.results)}</TableCell>
                     <TableCell className="text-right bg-blue-100/50 text-blue-900">{fmtCurrency(totals.avgCpl)}</TableCell>
                     <TableCell className="text-right text-slate-900">{fmtPct(totals.avgCtr)}</TableCell>
                     <TableCell className="text-right text-slate-900">{fmtCurrency(totals.avgCpc)}</TableCell>
                     <TableCell className="text-right text-slate-900 text-xs">{fmtInt(totals.reach)}</TableCell>
                     <TableCell className="text-center"></TableCell>
                     <TableCell className="text-right text-slate-500 text-xs">{fmtCurrency(totals.totalGastoLife)}</TableCell>
                     <TableCell className={cn("text-right", totals.saldo < 1000 ? "text-red-700" : "text-emerald-800")}>{fmtCurrency(totals.saldo)}</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
      </div>
    </div>
  );
};
