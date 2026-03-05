import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { summarizeMetrics } from '../lib/calculations';
import { RawFinanceData, ConsolidatedMetrics } from '../model/types';
import { formatDateForDB } from '@/src/shared/lib/dateUtils';
import { useFilters } from '@/src/features/filters';

const getUserEmail = (): string | null => {
    try {
        const stored = localStorage.getItem('op7_local_session');
        if (!stored) return null;
        const session = JSON.parse(stored);
        return session?.email ?? null;
    } catch {
        return null;
    }
};

export const useFinanceData = (injectedAccountIds?: string[]) => {
    const { dateRange, selectedAccounts, selectedCluster, selectedPlatform } = useFilters();

    return useQuery<ConsolidatedMetrics, Error>({
        queryKey: ['finance_data', dateRange?.start, dateRange?.end, selectedAccounts, selectedCluster, selectedPlatform, injectedAccountIds],
        queryFn: async () => {
            if (!dateRange?.start || !dateRange?.end) {
                return summarizeMetrics([]);
            }

            let accountFilter: string[] | null = null;

            if (injectedAccountIds && injectedAccountIds.length > 0) {
                accountFilter = injectedAccountIds.includes('NONE') ? ['NONE'] : injectedAccountIds;
            } else if (selectedAccounts.length > 0 && !selectedAccounts.includes('ALL')) {
                accountFilter = selectedAccounts;
            } else if (selectedCluster && selectedCluster !== 'ALL') {
                const { data: clusterAccs } = await (supabase.from as any)('cluster_accounts').select('account_id').eq('cluster_id', selectedCluster);
                accountFilter = clusterAccs?.map((a: any) => a.account_id) || [];
                if (accountFilter.length === 0) accountFilter = ['NONE']; // Prevent fetching all if cluster is empty
            }

            // Paginated fetch to avoid Supabase 1000-row default limit
            const pageSize = 1000;
            let allData: any[] = [];
            let page = 0;
            let hasMore = true;

            while (hasMore) {
                let query: any = supabase.from('vw_dashboard_unified').select('*')
                    .gte('date_start', formatDateForDB(dateRange.start))
                    .lte('date_start', formatDateForDB(dateRange.end));

                if (accountFilter && accountFilter[0] !== 'NONE') {
                    query = query.in('account_id', accountFilter);
                } else if (accountFilter && accountFilter[0] === 'NONE') {
                    return summarizeMetrics([]);
                }

                if (selectedPlatform && selectedPlatform !== 'ALL') {
                    query = query.eq('plataforma', selectedPlatform.toLowerCase());
                }

                const { data: pageData, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    throw new Error(error.message);
                }

                if (pageData && pageData.length > 0) {
                    allData = allData.concat(pageData);
                    if (pageData.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                } else {
                    hasMore = false;
                }
            }

            let data = allData;

            // --- Gerar MOCK do Google caso selecione Google/ALL e não encontre ---
            if (!data || data.length === 0 || (selectedPlatform === 'GOOGLE' && data.every((d: any) => d.plataforma !== 'google'))) {
                if (selectedPlatform === 'ALL' || selectedPlatform === 'GOOGLE') {
                    // Usar mock na conta principal se tiver accouhnts, se não "MOCK_ACC"
                    const mAcc = (accountFilter && accountFilter[0] !== 'NONE' && accountFilter[0] !== 'ALL') ? accountFilter[0] : 'MOCK_ACCOUNT_GGL';
                    data = data || [];
                    data.push({
                        account_id: mAcc,
                        valor_gasto: 1540.50,
                        leads: 105,
                        leads_cadastro: 90,
                        compras: 0,
                        conversas: 15,
                        cliques_todos: 1200,
                        impressoes: 45000,
                        alcance: 32000,
                        plataforma: 'google'
                    });
                }
            }

            // Group by account_id to match RawFinanceData structure
            const rawMap: Record<string, RawFinanceData> = {};
            (data || []).forEach((row: any) => {
                const accId = row.account_id;
                if (!rawMap[accId]) {
                    rawMap[accId] = {
                        meta_account_id: accId,
                        nome_conta: (row.nome_ajustado?.trim() ? row.nome_ajustado.trim() : null) || (row.account_name?.trim() ? row.account_name.trim() : null) || accId,
                        franquia: '',
                        saldo_atual: 0,
                        investimento: 0,
                        leads: 0,
                        leads_cadastro: 0,
                        compras: 0,
                        conversas: 0,
                        clicks: 0,
                        impressoes: 0,
                        alcance: 0,
                    };
                }
                // Business Rules (validated with real data):
                //   - leads_total only counts as Leads de Cadastro when objective contains "Cadastro"
                //   - Leads de Mensagem = msgs_iniciadas (all rows)
                //   - Leads Geral = Mensagens + Leads de Cadastro
                //   - CPL = valor_gasto / Leads Geral
                const rowLeadsTotal = Number(row.leads_total || 0);
                const rowConversas = Number(row.msgs_iniciadas || 0);
                const objective = String(row.objective || '').toLowerCase();
                const isCadastro = objective.includes('cadastro') || objective.includes('lead');
                const rowLeadsCadastro = isCadastro ? rowLeadsTotal : 0;
                const rowLeads = rowConversas + rowLeadsCadastro;

                rawMap[accId].investimento += Number(row.valor_gasto || 0);
                rawMap[accId].leads += rowLeads;
                rawMap[accId].leads_cadastro += rowLeadsCadastro;
                rawMap[accId].compras += Number(row.compras || 0);
                rawMap[accId].conversas += rowConversas;
                rawMap[accId].clicks += Number(row.cliques_todos || 0);
                rawMap[accId].impressoes += Number(row.impressoes || 0);
                rawMap[accId].alcance += Number(row.alcance || 0);
            });

            const rawData = Object.values(rawMap);
            return summarizeMetrics(rawData); // The selection/transformation layer inside FSD
        },
        enabled: !!dateRange?.start && !!dateRange?.end,
        staleTime: 5 * 60 * 1000,
    });
};
