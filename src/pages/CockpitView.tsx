import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { CampaignData } from '@/types';
import { RangeValue } from '@/src/shared/ui/calendar';
import { UserProfile } from '@/src/auth/types';
import {
  TrendingUp, DollarSign, Users, MessageSquare, Wallet,
  AlertCircle, AlertTriangle, PauseCircle, Crown, Palette, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area
} from 'recharts';

// ─── Color tokens (semantic, theme-agnostic) ─────────────────────────────────
// Structural colors → CSS variables (adapt to light/dark automatically)
// Semantic colors → hardcoded (intentional meaning: good/bad/warn/info)
const V = {
  bgTertiary: 'var(--color-background-tertiary)',
  bgSecondary: 'var(--color-background-secondary)',
  bgPrimary: 'var(--color-background-primary)',
  borderTertiary: 'var(--color-border-tertiary)',
  borderSecondary: 'var(--color-border-secondary)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',
} as const;

const C = {
  green: '#00FF88',
  red: '#FF4444',
  amber: '#FFB300',
  blue: '#378ADD',
} as const;

const FONT_MONO = "'DM Mono', monospace";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AIInsight {
  id: string;
  title: string;
  insight_type: string;
  severity: string;
  content: Record<string, unknown>;
  generated_at: string;
  acknowledged_at: string | null;
}

interface AccountRow {
  account_id: string;
  account_name: string;
  investimento: number;
  leads: number;
  cpl: number;
  trend: number[];
  status: 'top' | 'atencao' | 'ativo';
}

interface CreativeCard {
  ad_id: string;
  ad_name: string;
  ad_image_url: string | null;
  cpl: number;
  ctr: number;
  leads: number;
  rank: number;
  isBest: boolean;
  isWorst: boolean;
}

interface CockpitViewProps {
  data: CampaignData[];
  dateRange?: RangeValue;
  selectedAccounts?: string[];
  metaAccounts?: Array<{ saldo_balanco?: string | number; updated_at?: string }>;
  userProfile: UserProfile | null;
  onNavigateView?: (view: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number, prefix = '', suffix = '') {
  if (Math.abs(v) >= 10000) return `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`;
  return `${prefix}${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'agora';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const SEVERITY_COLORS: Record<string, { bg: string; label: string }> = {
  critical: { bg: C.red, label: 'Crítico' },
  high: { bg: C.amber, label: 'Alto' },
  medium: { bg: C.blue, label: 'Médio' },
  low: { bg: V.textTertiary, label: 'Baixo' },
};

// ─── Component ──────────────────────────────────────────────────────────────

function CockpitView({ data, metaAccounts, userProfile, onNavigateView }: CockpitViewProps) {
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoadingInsights(true);
      try {
        const isAdmin = (userProfile?.role as string) === 'admin'

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let aiQuery = (supabase as any)
          .from('ai_insights')
          .select('id, account_id, insight_type, severity, title, content, generated_at, acknowledged_at')
          .order('generated_at', { ascending: false })
          .order('severity', { ascending: false })
          .limit(10)

        if (!isAdmin && userProfile?.assigned_account_ids?.length) {
          aiQuery = aiQuery.in('account_id', userProfile.assigned_account_ids)
        }

        const { data: rows } = await aiQuery
        setAiInsights((rows ?? []) as AIInsight[])
      } catch { /* ignore */ } finally {
        setLoadingInsights(false)
      }
    };
    fetch();
  }, [userProfile]);

  // ── Aggregate KPIs ──
  const kpis = useMemo(() => {
    const totalGasto = data.reduce((s, r) => s + (r.valor_gasto ?? 0), 0);
    const totalLeads = data.reduce((s, r) => s + (r.leads_total ?? 0), 0);
    const totalMsgs = data.reduce((s, r) => s + (r.msgs_iniciadas ?? 0), 0);
    const cplMedio = totalLeads > 0 ? totalGasto / totalLeads : 0;
    const totalSaldo = (metaAccounts ?? []).reduce((s, a) => {
      const v = typeof a.saldo_balanco === 'string' ? parseFloat(a.saldo_balanco) : (a.saldo_balanco ?? 0);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const lowBalanceAccounts = (metaAccounts ?? []).filter(a => {
      const v = typeof a.saldo_balanco === 'string' ? parseFloat(a.saldo_balanco) : (a.saldo_balanco ?? 0);
      return !isNaN(v) && v < 100;
    }).length;

    // Latest update
    const updates = data.map(d => (d as unknown as Record<string, unknown>).updated_at).filter(Boolean) as string[];
    const metaUpdates = (metaAccounts ?? []).map(a => a.updated_at).filter(Boolean) as string[];
    const allUpdates = [...updates, ...metaUpdates].sort().reverse();
    const lastUpdate = allUpdates[0] ? new Date(allUpdates[0]) : new Date();

    const activeAccounts = new Set(data.map(d => d.account_id).filter(Boolean)).size;

    return { totalGasto, totalLeads, totalMsgs, cplMedio, totalSaldo, lowBalanceAccounts, lastUpdate, activeAccounts };
  }, [data, metaAccounts]);

  // ── CPL over time ──
  const cplChartData = useMemo(() => {
    const byDate: Record<string, { gasto: number; leads: number }> = {};
    for (const row of data) {
      const d = row.date_start;
      if (!d) continue;
      if (!byDate[d]) byDate[d] = { gasto: 0, leads: 0 };
      byDate[d].gasto += row.valor_gasto ?? 0;
      byDate[d].leads += row.leads_total ?? 0;
    }
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
    const avgCpl = kpis.cplMedio;

    return sorted.map(([date, vals]) => ({
      date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      cpl: vals.leads > 0 ? Math.round((vals.gasto / vals.leads) * 100) / 100 : 0,
      avg: Math.round(avgCpl * 100) / 100,
      below: vals.leads > 0 ? (vals.gasto / vals.leads) <= avgCpl : true,
    }));
  }, [data, kpis.cplMedio]);

  // ── Account ranking ──
  const accountRows = useMemo((): AccountRow[] => {
    const byAccount: Record<string, { name: string; gasto: number; leads: number; dailyCpl: Record<string, number> }> = {};
    for (const row of data) {
      const id = row.account_id;
      if (!id) continue;
      if (!byAccount[id]) byAccount[id] = { name: row.account_name ?? id, gasto: 0, leads: 0, dailyCpl: {} };
      byAccount[id].gasto += row.valor_gasto ?? 0;
      byAccount[id].leads += row.leads_total ?? 0;
      if (row.date_start) {
        const dayLeads = row.leads_total ?? 0;
        const dayGasto = row.valor_gasto ?? 0;
        byAccount[id].dailyCpl[row.date_start] = dayLeads > 0 ? dayGasto / dayLeads : 0;
      }
    }
    const allCpls = Object.values(byAccount).filter(a => a.leads > 0).map(a => a.gasto / a.leads).sort((a, b) => a - b);
    const p10 = allCpls.length > 0 ? allCpls[Math.floor(allCpls.length * 0.1)] ?? 0 : 0;
    const p90 = allCpls.length > 0 ? allCpls[Math.floor(allCpls.length * 0.9)] ?? 0 : 0;

    const rows: AccountRow[] = Object.entries(byAccount).map(([id, a]) => {
      const cpl = a.leads > 0 ? Math.round((a.gasto / a.leads) * 100) / 100 : 0;
      const trendDates = Object.entries(a.dailyCpl).sort(([da], [db]) => da.localeCompare(db)).slice(-8);
      const trend = trendDates.map(([, v]) => v);
      let status: AccountRow['status'] = 'ativo';
      if (cpl > 0 && p10 > 0 && cpl <= p10) status = 'top';
      else if (cpl > 0 && p90 > 0 && cpl > p90) status = 'atencao';
      return { account_id: id, account_name: a.name, investimento: Math.round(a.gasto * 100) / 100, leads: a.leads, cpl, trend, status };
    });
    rows.sort((a, b) => {
      if (a.cpl === 0 && b.cpl === 0) return b.investimento - a.investimento;
      if (a.cpl === 0) return 1;
      if (b.cpl === 0) return -1;
      return a.cpl - b.cpl;
    });
    return rows.slice(0, 20);
  }, [data]);

  // ── Creative matrix ──
  const creatives = useMemo((): CreativeCard[] => {
    const byAd: Record<string, { name: string; img: string | null; gasto: number; leads: number; ctrSum: number; ctrCount: number }> = {};
    for (const row of data) {
      const id = String(row.ad_id ?? '');
      if (!id || id === '0') continue;
      if (!byAd[id]) byAd[id] = { name: row.ad_name ?? id, img: row.ad_image_url ?? null, gasto: 0, leads: 0, ctrSum: 0, ctrCount: 0 };
      byAd[id].gasto += row.valor_gasto ?? 0;
      byAd[id].leads += row.leads_total ?? 0;
      if ((row.ctr ?? 0) > 0) { byAd[id].ctrSum += row.ctr; byAd[id].ctrCount++; }
    }
    const entries = Object.entries(byAd)
      .map(([id, a]) => ({ ad_id: id, ad_name: a.name, ad_image_url: a.img, cpl: a.leads > 0 ? Math.round((a.gasto / a.leads) * 100) / 100 : 0, ctr: a.ctrCount > 0 ? Math.round((a.ctrSum / a.ctrCount) * 100) / 100 : 0, leads: a.leads }))
      .filter(c => c.leads > 0)
      .sort((a, b) => a.cpl - b.cpl);
    const avgCpl = entries.length > 0 ? entries.reduce((s, c) => s + c.cpl, 0) / entries.length : 0;
    const top8 = entries.slice(0, 8).map((c, i) => ({ ad_id: c.ad_id, ad_name: c.ad_name, ad_image_url: c.ad_image_url, cpl: c.cpl, ctr: c.ctr, leads: c.leads, rank: i + 1, isBest: i === 0, isWorst: false, avgCpl }));
    if (top8.length > 1 && top8[top8.length - 1].cpl > avgCpl * 2) top8[top8.length - 1].isWorst = true;
    return top8;
  }, [data]);

  // ── Unread alerts count ──
  const unreadAlerts = useMemo(() => aiInsights.filter(i => !i.acknowledged_at).length, [aiInsights]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ color: V.textPrimary }}>

      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight" style={{ color: V.textPrimary }}>
              Cockpit
            </h1>
            <p className="text-xs mt-1" style={{ color: V.textTertiary }}>
              <span className="font-medium" style={{ color: V.textSecondary }}>{kpis.activeAccounts} contas ativas</span>
              <span className="mx-1">·</span>
              última atualização <span className="font-mono" style={{ fontFamily: FONT_MONO, color: V.textPrimary }}>{formatTime(kpis.lastUpdate)}</span>
              <span className="mx-1">·</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#1853d330', color: '#58a6ff' }}>
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Meta Ads
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SEÇÃO 1 — KPI BAR ═══ */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Investimento */}
          <KPICard
            label="Investimento Total"
            value={fmt(kpis.totalGasto, 'R$ ')}
            icon={<DollarSign className="w-4 h-4" />}
            valueColor={V.textPrimary}
          />
          {/* Leads */}
          <KPICard
            label="Leads Totais"
            value={fmt(kpis.totalLeads)}
            icon={<Users className="w-4 h-4" />}
            valueColor={C.blue}
          />
          {/* CPL — destaque */}
          <div className="rounded-xl p-4 flex flex-col justify-between" style={{ background: V.bgSecondary, borderLeft: `3px solid ${kpis.cplMedio > 0 ? C.green : V.textTertiary}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: V.textTertiary }}>CPL Médio</span>
              <TrendingUp className="w-4 h-4" style={{ color: C.green }} />
            </div>
            <p className="text-[28px] font-medium leading-none" style={{ fontFamily: FONT_MONO, color: kpis.cplMedio > 0 ? C.green : V.textTertiary }}>
              {kpis.cplMedio > 0 ? fmt(kpis.cplMedio, 'R$ ') : '—'}
            </p>
          </div>
          {/* Saldo BMs */}
          <div className={`rounded-xl p-4 flex flex-col justify-between ${kpis.lowBalanceAccounts > 0 ? 'animate-pulse-warn' : ''}`} style={{ background: V.bgSecondary, border: `1px solid ${kpis.lowBalanceAccounts > 0 ? C.amber + '40' : V.borderTertiary}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: V.textTertiary }}>Saldo Total BMs</span>
              <Wallet className="w-4 h-4" style={{ color: kpis.lowBalanceAccounts > 0 ? C.amber : C.green }} />
            </div>
            <p className="text-[28px] font-medium leading-none" style={{ fontFamily: FONT_MONO, color: kpis.lowBalanceAccounts > 0 ? C.amber : C.green }}>
              {fmt(kpis.totalSaldo, 'R$ ')}
            </p>
            {kpis.lowBalanceAccounts > 0 && (
              <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: C.amber }}>
                <AlertTriangle className="w-3 h-3" /> {kpis.lowBalanceAccounts} conta(s) &lt; R$100
              </p>
            )}
          </div>
          {/* Mensagens */}
          <KPICard
            label="Mensagens Iniciadas"
            value={fmt(kpis.totalMsgs)}
            icon={<MessageSquare className="w-4 h-4" />}
            valueColor="#a78bfa"
          />
        </div>
      </div>

      {/* ═══ SEÇÃO 2 — GRÁFICO + FEED IA ═══ */}
      <div className="px-4 pb-3 grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Gráfico */}
        <div className="xl:col-span-2 rounded-xl p-4" style={{ background: V.bgSecondary }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-widest font-medium" style={{ color: V.textTertiary }}>
              CPL Diário — 30 dias
            </h3>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: V.textTertiary }}>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 rounded" style={{ background: C.green }} /> Abaixo da média</span>
              <span className="flex items-center gap-1"><span className="w-2 h-0.5 rounded" style={{ background: C.red }} /> Acima da média</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={cplChartData}>
              <defs>
                <linearGradient id="cplGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.green} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={V.borderTertiary} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: V.textTertiary }} axisLine={{ stroke: V.borderTertiary }} tickLine={{ stroke: V.borderTertiary }} />
              <YAxis tick={{ fontSize: 10, fill: V.textTertiary }} axisLine={{ stroke: V.borderTertiary }} tickLine={{ stroke: V.borderTertiary }} tickFormatter={(v: number) => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: V.bgPrimary, border: `1px solid ${V.borderSecondary}`, borderRadius: 8, fontSize: 12, color: V.textPrimary, fontFamily: FONT_MONO }}
                labelStyle={{ color: V.textTertiary, fontFamily: FONT_MONO }}
                formatter={(value: unknown) => [`R$${Number(value).toFixed(2)}`, 'CPL']}
              />
              <ReferenceLine y={kpis.cplMedio} stroke={C.amber} strokeDasharray="4 4" label={{ value: `Média R$${kpis.cplMedio.toFixed(2)}`, fill: C.amber, fontSize: 10, fontFamily: FONT_MONO }} />
              <Area
                type="monotone"
                dataKey="cpl"
                fill="url(#cplGrad)"
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cpl"
                stroke={C.green}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: C.green }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Feed IA */}
        <div className="rounded-xl p-4 flex flex-col" style={{ background: V.bgSecondary, maxHeight: 380 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-widest font-medium flex items-center gap-2" style={{ color: V.textTertiary }}>
              <AlertCircle className="w-3.5 h-3.5" /> Alertas IA
              {unreadAlerts > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold" style={{ background: C.red + '30', color: C.red }}>
                  {unreadAlerts}
                </span>
              )}
            </h3>
            {aiInsights.length > 0 && (
              <button
                onClick={() => onNavigateView?.('ai_insights')}
                className="text-[10px] hover:underline transition-colors"
                style={{ color: C.blue }}
              >
                Ver todos →
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${V.borderTertiary} transparent` }}>
            {loadingInsights ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Sparkles className="w-5 h-5 animate-pulse" style={{ color: V.textTertiary }} />
                <span className="text-[11px]" style={{ color: V.textTertiary }}>IA processando dados...</span>
              </div>
            ) : aiInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Sparkles className="w-5 h-5" style={{ color: V.borderTertiary }} />
                <span className="text-[11px] text-center" style={{ color: V.borderSecondary }}>
                  IA ainda coletando dados...<br />Execute a coleta para gerar insights.
                </span>
              </div>
            ) : (
              aiInsights.map((ins) => {
                const sev = SEVERITY_COLORS[ins.severity] ?? SEVERITY_COLORS.low;
                return (
                  <div
                    key={ins.id}
                    className="rounded-lg p-3 cursor-pointer transition-colors"
                    style={{ background: V.bgTertiary, borderLeft: `3px solid ${sev.bg}` }}
                    onClick={() => onNavigateView?.('ai_insights')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: sev.bg }}>{sev.label}</span>
                      <span className="text-[9px]" style={{ color: V.borderSecondary }}>{timeAgo(ins.generated_at)}</span>
                      {ins.acknowledged_at && <span className="text-[9px]" style={{ color: V.textTertiary }}>✓</span>}
                    </div>
                    <p className="text-[13px] font-medium truncate" style={{ color: V.textPrimary }}>{ins.title}</p>
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: V.textSecondary }}>
                      {String((ins.content as Record<string, unknown>)?.summary ?? '')}
                    </p>
                    {(ins.content as Record<string, unknown>)?.acao_sugerida && (
                      <p className="text-[10px] mt-1 italic" style={{ color: V.textTertiary }}>
                        → {String((ins.content as Record<string, unknown>)?.acao_sugerida)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ SEÇÃO 3 — RANKING DE CONTAS ═══ */}
      <div className="px-4 pb-3">
        <div className="rounded-xl" style={{ background: V.bgSecondary }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: V.borderTertiary }}>
            <h3 className="text-[11px] uppercase tracking-widest font-medium" style={{ color: V.textTertiary }}>
              Ranking de Contas
            </h3>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 420 }}>
            <table className="w-full text-xs" style={{ fontFamily: FONT_MONO }}>
              <thead className="sticky top-0 z-10" style={{ background: V.bgSecondary }}>
                <tr style={{ borderBottomColor: V.borderTertiary, borderBottomWidth: 1 }}>
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>Conta</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>Invest.</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>Leads</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>CPL</th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>vs Média</th>
                  <th className="text-center py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>Tendência</th>
                  <th className="text-center py-2.5 px-3 text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {accountRows.map((row, idx) => {
                  const vsMedia = kpis.cplMedio > 0 && row.cpl > 0 ? Math.round(((row.cpl - kpis.cplMedio) / kpis.cplMedio) * 100) : 0;
                  const isSelected = selectedAccountId === row.account_id;
                  return (
                    <tr
                      key={row.account_id}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: isSelected ? V.bgPrimary : idx % 2 === 0 ? V.bgTertiary : V.bgSecondary,
                      }}
                      onClick={() => setSelectedAccountId(row.account_id === selectedAccountId ? null : row.account_id)}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = V.bgPrimary; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? V.bgTertiary : V.bgSecondary; }}
                    >
                      <td className="py-2 px-3 truncate max-w-[220px]" style={{ color: V.textPrimary }}>{row.account_name}</td>
                      <td className="text-right py-2 px-3" style={{ color: V.textSecondary }}>{fmt(row.investimento, 'R$ ')}</td>
                      <td className="text-right py-2 px-3" style={{ color: V.textSecondary }}>{row.leads}</td>
                      <td className="text-right py-2 px-3 font-medium" style={{
                        color: row.cpl > 0 && row.cpl <= kpis.cplMedio ? C.green : row.cpl > kpis.cplMedio * 1.5 ? C.red : V.textSecondary
                      }}>
                        {row.cpl > 0 ? fmt(row.cpl, 'R$ ') : '—'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {row.cpl > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                            background: vsMedia <= 0 ? C.green + '20' : C.red + '20',
                            color: vsMedia <= 0 ? C.green : C.red,
                          }}>
                            {vsMedia > 0 ? '+' : ''}{vsMedia}%
                          </span>
                        ) : <span style={{ color: V.borderSecondary }}>—</span>}
                      </td>
                      <td className="text-center py-2 px-3">
                        <Sparkline data={row.trend} />
                      </td>
                      <td className="text-center py-2 px-3">
                        {row.status === 'top' && row.cpl > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.green + '20', color: C.green }}>top 10%</span>
                        )}
                        {row.status === 'atencao' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: C.red + '20', color: C.red }}>atenção</span>
                        )}
                        {row.status === 'ativo' && row.cpl > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px]" style={{ background: V.borderTertiary, color: V.textTertiary }}>ativo</span>
                        )}
                        {row.cpl === 0 && <span className="text-[10px]" style={{ color: V.borderSecondary }}>s/ leads</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SEÇÃO 4 — MATRIZ DE CRIATIVOS ═══ */}
      <div className="px-4 pb-4">
        <div className="rounded-xl" style={{ background: V.bgSecondary }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: V.borderTertiary }}>
            <h3 className="text-[11px] uppercase tracking-widest font-medium flex items-center gap-2" style={{ color: V.textTertiary }}>
              <Palette className="w-3.5 h-3.5" /> Matriz de Criativos
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {creatives.map((c) => {
              const avgC = creatives.length > 0 ? creatives.reduce((s, x) => s + x.cpl, 0) / creatives.length : 0;
              return (
                <div
                  key={c.ad_id}
                  className="group rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: V.bgTertiary, border: `1px solid ${c.isBest ? C.green + '50' : c.isWorst ? C.red + '50' : V.borderTertiary}` }}
                >
                  {/* Badge */}
                  {c.isBest && (
                    <div className="absolute z-10 flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.green, color: V.bgTertiary }}>
                      <Crown className="w-2.5 h-2.5" /> TOP
                    </div>
                  )}
                  {c.isWorst && (
                    <div className="absolute z-10 animate-pulse-warn flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: C.red, color: V.textPrimary }}>
                      <PauseCircle className="w-2.5 h-2.5" /> PAUSAR
                    </div>
                  )}
                  {/* Thumbnail */}
                  <div className="relative aspect-square overflow-hidden" style={{ background: V.borderTertiary }}>
                    {c.ad_image_url ? (
                      <img
                        src={c.ad_image_url}
                        alt={c.ad_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center text-[11px] ${c.ad_image_url ? 'hidden' : ''}`} style={{ color: V.borderSecondary }}>
                      Sem imagem
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'color-mix(in srgb, var(--color-background-primary) 85%, transparent)' }}>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: V.textTertiary }}>CPL</p>
                        <p className="text-2xl font-bold" style={{ fontFamily: FONT_MONO, color: c.cpl <= avgC ? C.green : C.red }}>
                          {fmt(c.cpl, 'R$ ')}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5 space-y-1">
                    <p className="text-[11px] truncate" style={{ color: V.textSecondary }} title={c.ad_name}>{c.ad_name}</p>
                    <p className="text-lg font-bold leading-none" style={{ fontFamily: FONT_MONO, color: c.cpl <= avgC ? C.green : C.red }}>
                      {fmt(c.cpl, 'R$ ')}
                    </p>
                    <div className="flex justify-between text-[10px]" style={{ color: V.borderSecondary }}>
                      <span>CTR {c.ctr}%</span>
                      <span>{c.leads} leads</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {creatives.length === 0 && (
            <div className="py-12 text-center" style={{ color: V.borderSecondary }}>
              <Palette className="w-8 h-8 mx-auto mb-2" style={{ color: V.borderTertiary }} />
              <p className="text-sm">Nenhum criativo com leads no período</p>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center text-[10px] py-6" style={{ color: V.borderTertiary }}>
        © {new Date().getFullYear()} BIHMKS·GOW — Cockpit de Performance
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPICard({ label, value, icon, valueColor }: { label: string; value: string; icon: React.ReactNode; valueColor: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col justify-between" style={{ background: V.bgSecondary, border: `1px solid ${V.borderTertiary}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: V.textTertiary }}>{label}</span>
        <span style={{ color: valueColor }}>{icon}</span>
      </div>
      <p className="text-[28px] font-medium leading-none" style={{ fontFamily: FONT_MONO, color: valueColor }}>{value}</p>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span style={{ color: V.borderSecondary }}>—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 56, h = 18;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const isUp = data[data.length - 1] > data[0];
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke={isUp ? C.red : C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default CockpitView;
