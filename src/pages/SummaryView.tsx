import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/src/shared/ui/table";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from "@/src/shared/lib/utils";
import { useFinanceData } from '@/src/entities/finance';
import { KPISection } from '@/src/widgets/KPISection';
import { MainCharts } from '@/src/widgets/MainCharts';
import { useFilters } from '@/src/features/filters';
import { useClusters } from '@/src/entities/cluster';
import { ClusterBreakdown } from '@/src/widgets/ClusterBreakdown';
import { ClusterRanking } from '@/src/widgets/ClusterRanking';

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

const fmtCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const fmtInt = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
const fmtDec = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

interface SummaryViewProps {
  data: any[];
  selectedFranchisee: string;
  selectedClient?: string;
  dateRange: any;
  allowedFranchises: string[];
  allowedAccounts: string[];
  externalSummaryData: any[];
  externalLoading: boolean;
  effectiveAccountIds?: string[];
}

export const SummaryView: React.FC<SummaryViewProps> = ({ effectiveAccountIds }) => {
  const { data: metrics, isLoading, isError, error } = useFinanceData(effectiveAccountIds);
  const { selectedCluster, selectedAccounts } = useFilters();
  const { data: clustersList } = useClusters();
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'investimento', direction: 'desc' });

  const rawData = metrics?.rawData || [];

  const sortedData = useMemo(() => {
    if (!sortConfig) return rawData;
    return [...rawData].sort((a, b) => {
      const valA = (a as any)[sortConfig.key] || 0;
      const valB = (b as any)[sortConfig.key] || 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rawData, sortConfig]);

  // Totals Calculation from backend raw rows
  const totals = useMemo(() => {
    return rawData.reduce((acc, row) => ({
      count: acc.count + 1,
      investimento: acc.investimento + (row.investimento || 0),
      compras: acc.compras + (row.compras || 0),
      leads: acc.leads + (row.leads || 0),
      conversas: acc.conversas + (row.conversas || 0),
      clicks: acc.clicks + (row.clicks || 0),
      reach: acc.reach + (row.alcance || 0),
      impressoes: acc.impressoes + (row.impressoes || 0),
      saldo_atual: acc.saldo_atual + (row.saldo_atual || 0)
    }), {
      count: 0, investimento: 0, compras: 0, leads: 0, conversas: 0, clicks: 0, reach: 0, impressoes: 0, saldo_atual: 0
    });
  }, [rawData]);

  const totalResults = totals.compras + totals.leads + totals.conversas;
  const avgCpl = totals.leads > 0 ? totals.investimento / totals.leads : 0;
  const avgCpc = totals.clicks > 0 ? totals.investimento / totals.clicks : 0;
  const avgCpr = totalResults > 0 ? totals.investimento / totalResults : 0;
  const avgCpm = totals.impressoes > 0 ? (totals.investimento / totals.impressoes) * 1000 : 0;
  const avgFreq = totals.reach > 0 ? totals.impressoes / totals.reach : 0;

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig?.key !== colKey) return <ArrowUpDown size={12} className="text-slate-300 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600 ml-1 inline" /> : <ArrowDown size={12} className="text-blue-600 ml-1 inline" />;
  };

  const requestSort = (key: string) => {
    let direction: SortDirection = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center gap-2 text-primary"><Loader2 className="animate-spin" /> Carregando relatório...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Erro: {error?.message}</div>;

  let dashboardTitle = "Resumo Gerencial (RPC)";
  let dashboardSubtitle = "Visão consolidada via Banco de Dados (Otimizado).";

  if (selectedCluster && selectedCluster !== 'ALL') {
    const clsName = clustersList?.find(c => c.id === selectedCluster)?.name || "Grupo";
    dashboardTitle = `Visão Consolidada: ${clsName}`;
    dashboardSubtitle = `Métricas somadas do Grupo e detalhamento por contas.`;
  } else if (selectedAccounts.length > 0 && !selectedAccounts.includes('ALL')) {
    const accName = rawData.length > 0 ? (rawData[0].nome_conta || (selectedAccounts.length === 1 ? selectedAccounts[0] : 'Várias Contas')) : (selectedAccounts.length === 1 ? selectedAccounts[0] : 'Várias Contas');
    dashboardTitle = `Visão Geral: ${accName}`;
    dashboardSubtitle = `Métricas exclusivas desta conta.`;
  } else {
    dashboardTitle = `Visão Global (Todas as Contas Ativas)`;
    dashboardSubtitle = `Performance agregada de todas as clínicas disponíveis.`;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{dashboardTitle}</h2>
        <p className="text-slate-500">{dashboardSubtitle}</p>
      </div>

      <KPISection accountIds={effectiveAccountIds} />

      {selectedCluster && selectedCluster !== 'ALL' && (
        <div className="space-y-6 mt-8">
          <ClusterRanking />
          <ClusterBreakdown />
        </div>
      )}

      <div className="mt-8 mb-8">
        <MainCharts accountIds={effectiveAccountIds} />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden mt-8">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[200px] cursor-pointer" onClick={() => requestSort('nome_conta')}>Conta <SortIcon colKey="nome_conta" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('investimento')}>Investimento <SortIcon colKey="investimento" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('compras')}>Compras <SortIcon colKey="compras" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('leads')}>Leads <SortIcon colKey="leads" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpl')}>CPL <SortIcon colKey="cpl" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpc')}>CPC <SortIcon colKey="cpc" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpr')}>CPR <SortIcon colKey="cpr" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('cpm')}>CPM <SortIcon colKey="cpm" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('freq')}>Freq. <SortIcon colKey="freq" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('impressoes')}>Impr. <SortIcon colKey="impressoes" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('clicks')}>Cliques <SortIcon colKey="clicks" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('saldo_atual')}>Saldo <SortIcon colKey="saldo_atual" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row: any, index: number) => {
              const rowResults = row.compras + row.leads + row.conversas;
              const cpl = row.cpl_total ?? (row.leads > 0 ? row.investimento / row.leads : 0);
              const cpc = row.clicks > 0 ? row.investimento / row.clicks : 0;
              const cpr = rowResults > 0 ? row.investimento / rowResults : 0;
              const cpm = row.impressoes > 0 ? (row.investimento / row.impressoes) * 1000 : 0;
              const freq = row.alcance > 0 ? row.impressoes / row.alcance : 0;

              const accId = row.meta_account_id || row.account_id || 'ID Desconhecido';
              const accountName = row.nome_conta && row.nome_conta.trim() !== '' ? row.nome_conta : `Conta ${accId}`;
              const rowKey = accId !== 'ID Desconhecido' ? accId : `unknown-${index}`;

              return (
                <TableRow key={rowKey} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-slate-800">
                    <div className="line-clamp-1" title={accountName}>{accountName}</div>
                    <div className="text-[10px] text-slate-400 font-normal font-mono">{accId}</div>
                  </TableCell>
                  <TableCell className="text-right">{fmtCurrency(row.investimento)}</TableCell>
                  <TableCell className="text-right">{row.compras}</TableCell>
                  <TableCell className="text-right">{row.leads}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpl)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpc)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpr)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtCurrency(cpm)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtDec(freq)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtInt(row.impressoes)}</TableCell>
                  <TableCell className="text-right text-slate-500">{fmtInt(row.clicks)}</TableCell>
                  <TableCell className={cn("text-right font-bold", (row.saldo_atual || 0) < 100 ? "text-red-600" : "text-emerald-700")}>{fmtCurrency(row.saldo_atual || 0)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <TableRow>
              <TableCell>Total ({totals.count})</TableCell>
              <TableCell className="text-right">{fmtCurrency(totals.investimento)}</TableCell>
              <TableCell className="text-right">{totals.compras}</TableCell>
              <TableCell className="text-right">{totals.leads}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpl)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpc)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpr)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(avgCpm)}</TableCell>
              <TableCell className="text-right">{fmtDec(avgFreq)}</TableCell>
              <TableCell className="text-right">{fmtInt(totals.impressoes)}</TableCell>
              <TableCell className="text-right">{fmtInt(totals.clicks)}</TableCell>
              <TableCell className="text-right">{fmtCurrency(metrics?.totalBalance || 0)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default SummaryView;
