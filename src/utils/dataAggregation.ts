
import { Database } from '../../types/database.types';

export type AdsInsightRow = Database['public']['Tables']['ads_insights']['Row'];

export interface AggregatedMetrics {
    valor_gasto: number;
    impressoes: number;
    cliques_todos: number;
    leads: number;
    compras: number;
    conversas: number;
    leads_cadastro: number;
    alcance: number;

    // Calculated
    cpc: number;
    ctr: number;
    cpm: number;
    cpl_total: number;
    cpl_conversas: number;
    cpl_cadastro: number;
    cpl_compras: number;
    frequencia: number;
}

/**
 * Calculates aggregated metrics from a list of raw ads_insights rows.
 * Handles division by zero gracefully.
 */
export const calculateMetrics = (data: AdsInsightRow[]): AggregatedMetrics => {

    // 1. Sum basic metrics
    // Business Rules (validated with real data):
    //   - Leads de Mensagem = SUM(msgs_iniciadas) — all rows
    //   - Leads de Cadastro = SUM(leads_total) — ONLY rows where objective contains "Cadastro"
    //   - Leads Geral = Leads de Mensagem + Leads de Cadastro
    //   - CPL = valor_gasto / Leads Geral
    const totals = data.reduce((acc, row) => {
        const rowMsgsIniciadas = Number((row as any).msgs_iniciadas || 0);
        const rowCompras = Number((row as any).compras || 0);
        const rowLeadsTotal = Number((row as any).leads_total || 0);

        // leads_total only counts as Leads de Cadastro when objective contains "Cadastro"
        const objective = String((row as any).objective || '').toLowerCase();
        const isCadastro = objective.includes('cadastro') || objective.includes('lead');
        const rowLeadsCadastro = isCadastro ? rowLeadsTotal : 0;

        // Leads Geral = Mensagens + Leads de Cadastro
        const rowLeadsGeral = rowMsgsIniciadas + rowLeadsCadastro;

        return {
            valor_gasto: acc.valor_gasto + (row.valor_gasto || 0),
            impressoes: acc.impressoes + Number((row as any).impressoes || 0),
            cliques_todos: acc.cliques_todos + Number((row as any).cliques_todos || 0),
            leads: acc.leads + rowLeadsGeral,
            compras: acc.compras + rowCompras,
            conversas: acc.conversas + rowMsgsIniciadas,
            leads_cadastro: acc.leads_cadastro + rowLeadsCadastro,
            alcance: acc.alcance + Number((row as any).alcance || 0),
        };
    }, {
        valor_gasto: 0,
        impressoes: 0,
        cliques_todos: 0,
        leads: 0,
        compras: 0,
        conversas: 0,
        leads_cadastro: 0,
        alcance: 0,
    });

    // 2. Calculate derived metrics
    const cpc = totals.cliques_todos > 0 ? totals.valor_gasto / totals.cliques_todos : 0;
    const ctr = totals.impressoes > 0 ? (totals.cliques_todos / totals.impressoes) * 100 : 0;
    const cpm = totals.impressoes > 0 ? (totals.valor_gasto / totals.impressoes) * 1000 : 0;

    const cpl_total = totals.leads > 0 ? totals.valor_gasto / totals.leads : 0;
    const cpl_conversas = totals.conversas > 0 ? totals.valor_gasto / totals.conversas : 0;
    const cpl_cadastro = totals.leads_cadastro > 0 ? totals.valor_gasto / totals.leads_cadastro : 0;
    const cpl_compras = totals.compras > 0 ? totals.valor_gasto / totals.compras : 0;

    const frequencia = totals.alcance > 0 ? totals.impressoes / totals.alcance : 0;

    return {
        ...totals,
        cpc,
        ctr,
        cpm,
        cpl_total,
        cpl_conversas,
        cpl_cadastro,
        cpl_compras,
        frequencia
    };
};

/**
 * Helper to group data by a key (e.g., account_id, campaign_name)
 */
export const groupDataBy = (data: AdsInsightRow[], key: keyof AdsInsightRow) => {
    return data.reduce((acc, row) => {
        const groupKey = String(row[key] || 'Unknown');
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(row);
        return acc;
    }, {} as Record<string, AdsInsightRow[]>);
};
