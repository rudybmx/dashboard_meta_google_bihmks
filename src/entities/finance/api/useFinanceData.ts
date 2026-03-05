import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { summarizeMetrics } from '../lib/calculations';
import { RawFinanceData, ConsolidatedMetrics } from '../model/types';
import { formatDateForDB } from '@/src/shared/lib/dateUtils';
import { fetchMetaAccounts } from '@/services/supabaseService';
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

            // 1. Fetch metadata for all accounts (already respects permissions via RPC)
            const metaAccounts = await fetchMetaAccounts();

            let accountFilter: string[] | null = null;

            if (injectedAccountIds && injectedAccountIds.length > 0) {
                accountFilter = injectedAccountIds.includes('NONE') ? ['NONE'] : injectedAccountIds;
            } else if (selectedAccounts.length > 0 && !selectedAccounts.includes('ALL')) {
                accountFilter = selectedAccounts;
            } else if (selectedCluster && selectedCluster !== 'ALL') {
                const { data: clusterAccs } = await (supabase.from as any)('cluster_accounts').select('account_id').eq('cluster_id', selectedCluster);
                accountFilter = clusterAccs?.map((a: any) => a.account_id) || [];
                if (accountFilter.length === 0) accountFilter = ['NONE'];
            }

            // 2. Filter base accounts
            let baseAccounts = metaAccounts;
            if (accountFilter && accountFilter[0] !== 'NONE' && !accountFilter.includes('ALL')) {
                baseAccounts = metaAccounts.filter(a => accountFilter!.includes(a.account_id));
            } else if (accountFilter && accountFilter[0] === 'NONE') {
                return summarizeMetrics([]);
            }

            // 3. Paginated fetch for relative period
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
                }

                if (selectedPlatform && selectedPlatform !== 'ALL') {
                    query = query.eq('plataforma', selectedPlatform.toLowerCase());
                }

                const { data: pageData, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw new Error(error.message);

                if (pageData && pageData.length > 0) {
                    allData = allData.concat(pageData);
                    if (pageData.length < pageSize) hasMore = false;
                    else page++;
                } else {
                    hasMore = false;
                }
            }

            // 4. Initialize Map with all base accounts (ensures they appear with 0 if no spend)
            const rawMap: Record<string, RawFinanceData> = {};
            baseAccounts.forEach(acc => {
                rawMap[acc.account_id] = {
                    meta_account_id: acc.account_id,
                    nome_conta: acc.display_name || acc.account_name || acc.account_id,
                    franquia: acc.franchise_name || '',
                    saldo_atual: Number(acc.current_balance || 0),
                    investimento: 0,
                    leads: 0,
                    leads_cadastro: 0,
                    compras: 0,
                    conversas: 0,
                    clicks: 0,
                    impressoes: 0,
                    alcance: 0,
                };
            });

            // 5. Populate map with real metrics
            const seenSaldoAccs = new Set<string>();

            (allData || []).forEach((row: any) => {
                const accId = row.account_id;

                // If account not in base list (e.g. Google mock or inconsistent ID), add it
                if (!rawMap[accId]) {
                    rawMap[accId] = {
                        meta_account_id: accId,
                        nome_conta: (row.nome_ajustado?.trim() ? row.nome_ajustado.trim() : null) || (row.account_name?.trim() ? row.account_name.trim() : null) || accId,
                        franquia: row.nome_franqueado || '',
                        saldo_atual: Number(row.saldo_atual || 0),
                        investimento: 0,
                        leads: 0,
                        leads_cadastro: 0,
                        compras: 0,
                        conversas: 0,
                        clicks: 0,
                        impressoes: 0,
                        alcance: 0,
                    };
                    seenSaldoAccs.add(accId);
                } else if (!seenSaldoAccs.has(accId) && row.saldo_atual !== undefined && row.saldo_atual !== null) {
                    // Restaura o saldo vindo da View apenas uma vez por conta
                    rawMap[accId].saldo_atual = Number(row.saldo_atual || 0);
                    seenSaldoAccs.add(accId);
                }

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
            return summarizeMetrics(rawData);
        },
        enabled: !!dateRange?.start && !!dateRange?.end,
        staleTime: 5 * 60 * 1000,
    });
};
