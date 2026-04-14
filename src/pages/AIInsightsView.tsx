import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/services/supabaseClient';
import { UserProfile } from '@/src/auth/types';
import {
  Sparkles, AlertCircle, AlertTriangle, CheckCircle2, Info,
  Save, ToggleLeft, ToggleRight, Loader2, ArrowUpRight, ArrowDownRight, Minus,
  Zap, RefreshCw, X,
} from 'lucide-react';

// ─── Severity config (semantic colors — fixed, not theme-dependent) ───────────
const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#3b82f6',
  low:      '#6b7280',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  high:     'Alto',
  medium:   'Médio',
  low:      'Baixo',
};

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3.5 h-3.5" />,
  high:     <AlertTriangle className="w-3.5 h-3.5" />,
  medium:   <Info className="w-3.5 h-3.5" />,
  low:      <CheckCircle2 className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  anomaly:        'Anomalia',
  recommendation: 'Recomendação',
  benchmark:      'Benchmark',
};

const AVAILABLE_MODELS = [
  { id: 'google/gemini-2.0-flash-001',             label: 'Gemini 2.0 Flash',   cost: '~$0.10/M' },
  { id: 'google/gemini-2.5-flash',                 label: 'Gemini 2.5 Flash',   cost: '~$0.15/M' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',  label: 'Llama 3.3 70B',      cost: 'Free' },
  { id: 'mistralai/mistral-small-3.1-24b',         label: 'Mistral Small 3.1',  cost: '~$0.07/M' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIInsight {
  id: string;
  account_id: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  plataforma: string | null;
  insight_type: string | null;
  severity: string | null;
  title: string | null;
  content: Record<string, unknown> | string | null;
  generated_at: string | null;
  acknowledged_at: string | null;
}

interface ContentData {
  summary?: string;
  metric?: string;
  valor_atual?: number;
  valor_referencia?: number;
  variacao_percentual?: number;
  acao_sugerida?: string;
  account_name?: string;
}

interface AccountName {
  account_id: string;
  nome_ajustado: string | null;
  nome_original: string | null;
}

interface SystemConfig {
  ai_insights_model: string;
  ai_insights_enabled: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseContent(raw: Record<string, unknown> | string | null): ContentData {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as ContentData; } catch { return {}; }
  }
  return raw as ContentData;
}

function fmtMoney(v: number): string {
  if (v >= 1000) return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMetric(v: number, metric: string): string {
  if (!metric || v === 0) return String(v);
  if (metric === 'cpl' || metric === 'gasto') return fmtMoney(v);
  if (metric === 'ctr' || metric === 'frequencia') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Returns true when a positive variacao_percentual is BAD for this metric */
function isPositiveBad(metric: string): boolean {
  return metric === 'cpl' || metric === 'gasto';
}

function variationColor(variacao: number, metric: string): string {
  if (variacao === 0) return 'hsl(var(--muted-foreground))';
  const positive = variacao > 0;
  const bad = isPositiveBad(metric) ? positive : !positive;
  return bad ? '#ef4444' : '#22c55e';
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function getModelShort(modelId: string): string {
  const m = AVAILABLE_MODELS.find(x => x.id === modelId);
  return m ? m.label : modelId.slice(0, 16);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AIInsightsViewProps {
  userProfile: UserProfile | null;
}

export function AIInsightsView({ userProfile }: AIInsightsViewProps) {
  const [insights, setInsights]         = useState<AIInsight[]>([]);
  const [loading, setLoading]           = useState(true);
  const [config, setConfig]             = useState<SystemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map());

  // Filters
  const [filterType, setFilterType]         = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterAccount, setFilterAccount]   = useState('all');

  // Generate
  const [generating, setGenerating]       = useState(false);
  const [toast, setToast]                 = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isAdmin = (userProfile?.role as string) === 'admin' || (userProfile?.role as string) === 'executive';

  // ── Fetch insights ──
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('ai_insights')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(100);

      if (!isAdmin && userProfile) {
        const ids = userProfile.assigned_account_ids;
        if (ids && ids.length > 0) query = query.in('account_id', ids);
      }

      const { data } = await query;
      const rows: AIInsight[] = data ?? [];
      setInsights(rows);

      // Fetch account names for unique account_ids
      const uniqueIds = [...new Set(rows.map((r: AIInsight) => r.account_id).filter(Boolean))] as string[];
      if (uniqueIds.length > 0) {
        const { data: nomes } = await supabase
          .from('tb_meta_ads_contas')
          .select('account_id, nome_ajustado, nome_original')
          .in('account_id', uniqueIds) as { data: AccountName[] | null };

        const map = new Map<string, string>();
        for (const n of nomes ?? []) {
          map.set(n.account_id, n.nome_ajustado ?? n.nome_original ?? n.account_id);
        }
        setAccountNames(map);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [isAdmin, userProfile]);

  // ── Fetch config ──
  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('system_config')
        .select('key, value')
        .in('key', ['ai_insights_model', 'ai_insights_enabled']);

      const cfg: SystemConfig = { ai_insights_model: 'google/gemini-2.0-flash-001', ai_insights_enabled: true };
      for (const row of data ?? []) {
        if (row.key === 'ai_insights_model') cfg.ai_insights_model = row.value as string;
        if (row.key === 'ai_insights_enabled') cfg.ai_insights_enabled = row.value as boolean;
      }
      setConfig(cfg);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchInsights();
    if (isAdmin) fetchConfig();
  }, [fetchInsights, fetchConfig, isAdmin]);

  // ── Acknowledge ──
  const handleAcknowledge = async (id: string) => {
    await (supabase as any)
      .from('ai_insights')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, acknowledged_at: new Date().toISOString() } : i));
  };

  // ── Generate insights ──
  const handleGenerate = async () => {
    setGenerating(true);
    setToast(null);
    try {
      const res = await fetch('https://haujeexmwnowhviwcrqy.supabase.co/functions/v1/analyze-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      const result = await res.json();
      const accounts = result.accounts_analyzed ?? 0;
      const generated = result.insights_generated ?? 0;
      setToast({ type: 'success', msg: `${generated} insights gerados para ${accounts} contas` });
      await fetchInsights();
    } catch (e) {
      setToast({ type: 'error', msg: e instanceof Error ? e.message : 'Erro ao gerar insights' });
    } finally {
      setGenerating(false);
    }
  };

  // ── Config handlers ──
  const handleSaveModel = async () => {
    setConfigLoading(true);
    try {
      await (supabase as any)
        .from('system_config')
        .update({ value: config?.ai_insights_model, updated_at: new Date().toISOString() })
        .eq('key', 'ai_insights_model');
    } catch { /* ignore */ } finally {
      setConfigLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!config) return;
    const newVal = !config.ai_insights_enabled;
    try {
      await (supabase as any)
        .from('system_config')
        .update({ value: newVal, updated_at: new Date().toISOString() })
        .eq('key', 'ai_insights_enabled');
      setConfig(prev => prev ? { ...prev, ai_insights_enabled: newVal } : null);
    } catch { /* ignore */ }
  };

  // ── Filters & counts ──
  const uniqueAccounts = useMemo(() => {
    const ids = [...new Set(insights.map(i => i.account_id).filter(Boolean))] as string[];
    return ids.map(id => ({ id, label: accountNames.get(id) ?? id }));
  }, [insights, accountNames]);

  const filtered = useMemo(() => insights.filter(ins => {
    if (filterType !== 'all' && ins.insight_type !== filterType) return false;
    if (filterSeverity !== 'all' && ins.severity !== filterSeverity) return false;
    if (filterAccount !== 'all' && ins.account_id !== filterAccount) return false;
    return true;
  }), [insights, filterType, filterSeverity, filterAccount]);

  const totalInsights  = insights.length;
  const filteredCount  = filtered.length;
  const unreadCount    = useMemo(() => insights.filter(i => !i.acknowledged_at).length, [insights]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ═══ HEADER ═══ */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-violet-500" />
              Insights IA
            </h1>
            <p className="text-xs mt-1 text-muted-foreground">
              <span className="font-medium">{totalInsights} insights gerados</span>
              {unreadCount > 0 && (
                <><span className="mx-1">·</span><span className="text-red-500">{unreadCount} não lidos</span></>
              )}
              {config && (
                <><span className="mx-1">·</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600">
                    {getModelShort(config.ai_insights_model)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchInsights}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 bg-violet-500/10 text-violet-600 border border-violet-500/30 hover:bg-violet-500/20"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? 'Analisando contas...' : 'Gerar agora'}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-600'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-auto hover:opacity-70">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type */}
          <FilterPills
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'anomaly', label: 'Anomalia' },
              { value: 'recommendation', label: 'Recomendação' },
              { value: 'benchmark', label: 'Benchmark' },
            ]}
            selected={filterType}
            onChange={setFilterType}
          />

          {/* Severity */}
          <FilterPills
            options={[
              { value: 'all',      label: 'Todos' },
              { value: 'critical', label: 'Crítico' },
              { value: 'high',     label: 'Alto' },
              { value: 'medium',   label: 'Médio' },
              { value: 'low',      label: 'Baixo' },
            ]}
            selected={filterSeverity}
            onChange={setFilterSeverity}
          />

          {/* Account */}
          {uniqueAccounts.length > 1 && (
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-[11px] focus:outline-none bg-card border border-border text-muted-foreground"
            >
              <option value="all">Todas as contas</option>
              {uniqueAccounts.map(({ id, label }) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          )}

          <span className="text-[10px] ml-auto text-muted-foreground">
            {filteredCount} de {totalInsights} insights
          </span>
        </div>
      </div>

      {/* ═══ CARDS ═══ */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando insights...</span>
          </div>

        ) : filtered.length === 0 ? (
          <div className="rounded-xl p-12 text-center flex flex-col items-center gap-4 bg-card border border-border">
            <Sparkles className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <p className="font-medium text-foreground">Nenhum insight encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalInsights > 0
                  ? 'Ajuste os filtros para ver mais resultados'
                  : 'Clique em "Gerar agora" para analisar suas campanhas'}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-500/10 text-violet-600 border border-violet-500/30 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? 'Gerando...' : 'Gerar agora'}
            </button>
          </div>

        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(ins => (
              <InsightCard
                key={ins.id}
                insight={ins}
                accountName={accountNames.get(ins.account_id ?? '') ?? ins.account_id ?? ''}
                onAcknowledge={handleAcknowledge}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══ CONFIG (admin) ═══ */}
      {isAdmin && config && (
        <div className="px-4 pb-6">
          <div className="rounded-xl p-4 bg-card border border-border">
            <h3 className="text-[11px] uppercase tracking-widest font-medium mb-4 text-muted-foreground flex items-center gap-2">
              ⚙ Configuração de IA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelo</label>
                <select
                  value={config.ai_insights_model}
                  onChange={e => setConfig(prev => prev ? { ...prev, ai_insights_model: e.target.value } : null)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none bg-background border border-border text-foreground"
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.label} — {m.cost}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveModel}
                  disabled={configLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-600 border border-violet-500/30 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                >
                  {configLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar modelo
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Insights automáticos</label>
                <div className="flex items-center gap-3">
                  <button onClick={handleToggleEnabled} className="transition-colors">
                    {config.ai_insights_enabled
                      ? <ToggleRight className="w-10 h-10 text-green-500" />
                      : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
                  </button>
                  <span className={`text-sm ${config.ai_insights_enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {config.ai_insights_enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-[10px] py-6 text-border">
        © {new Date().getFullYear()} BIHMKS·GOW — Insights IA
      </footer>
    </div>
  );
}

// ─── FilterPills ──────────────────────────────────────────────────────────────

function FilterPills({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden bg-muted border border-border">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[11px] transition-colors ${
            selected === opt.value
              ? 'bg-card text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({
  insight: ins,
  accountName,
  onAcknowledge,
}: {
  insight: AIInsight;
  accountName: string;
  onAcknowledge: (id: string) => void;
}) {
  const content    = parseContent(ins.content);
  const sevColor   = SEVERITY_COLOR[ins.severity ?? 'low'] ?? SEVERITY_COLOR.low;
  const sevLabel   = SEVERITY_LABEL[ins.severity ?? 'low'] ?? 'Baixo';
  const sevIcon    = SEVERITY_ICON[ins.severity ?? 'low'];
  const typeLabel  = TYPE_LABELS[ins.insight_type ?? ''] ?? ins.insight_type ?? '';
  const isAck      = !!ins.acknowledged_at;

  const metric     = content.metric ?? '';
  const valorAtual = content.valor_atual ?? 0;
  const valorRef   = content.valor_referencia ?? 0;
  const variacao   = content.variacao_percentual ?? 0;
  const hasMetrics = valorAtual > 0 || valorRef > 0;

  const varColor = variationColor(variacao, metric);

  return (
    <div
      className="rounded-xl transition-all bg-card border border-border"
      style={{
        borderLeftColor: sevColor,
        borderLeftWidth: 3,
        opacity: isAck ? 0.6 : 1,
      }}
    >
      {/* ── Header row ── */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
          style={{ color: sevColor }}
        >
          {sevIcon} {sevLabel}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {typeLabel}
        </span>
        {accountName && (
          <span className="text-[9px] text-muted-foreground truncate max-w-[140px]" title={accountName}>
            {accountName}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground ml-auto">
          {timeAgo(ins.generated_at)}
        </span>
      </div>

      {/* ── Title + Summary ── */}
      <div className="px-4 pb-3">
        <h4 className="text-[18px] font-bold leading-tight text-foreground">
          {ins.title}
        </h4>
        {content.summary && (
          <p className="text-[13px] leading-relaxed mt-1 text-muted-foreground">
            {content.summary}
          </p>
        )}
      </div>

      {/* ── Metrics ── */}
      {hasMetrics && (
        <div className="mx-4 mb-3 rounded-lg px-3 py-2 bg-muted grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Atual</p>
            <p className="text-sm font-semibold font-mono text-foreground">
              {fmtMetric(valorAtual, metric)}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center">
            {variacao > 0
              ? <ArrowUpRight className="w-4 h-4" style={{ color: varColor }} />
              : variacao < 0
              ? <ArrowDownRight className="w-4 h-4" style={{ color: varColor }} />
              : <Minus className="w-4 h-4 text-muted-foreground" />
            }
            <span className="text-[10px] font-semibold font-mono" style={{ color: varColor }}>
              {variacao > 0 ? '+' : ''}{variacao}%
            </span>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
              {ins.insight_type === 'benchmark' ? 'Cluster' : 'Referência'}
            </p>
            <p className="text-sm font-semibold font-mono text-muted-foreground">
              {fmtMetric(valorRef, metric)}
            </p>
          </div>
        </div>
      )}

      {/* ── Ação sugerida ── */}
      {content.acao_sugerida && (
        <div className="mx-4 mb-3 rounded-lg p-3 bg-muted">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Ação sugerida</p>
          <p className="text-[12px] leading-relaxed text-foreground">
            → {content.acao_sugerida}
          </p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-4 pb-3 flex items-center justify-between">
        {!isAck ? (
          <button
            onClick={() => onAcknowledge(ins.id)}
            className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" /> Marcar como visto
          </button>
        ) : (
          <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" /> Visto
          </span>
        )}
        {ins.account_id && (
          <span className="text-[9px] font-mono text-muted-foreground/50">
            {ins.account_id.slice(-6)}
          </span>
        )}
      </div>
    </div>
  );
}

export default AIInsightsView;
