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

export const useFinanceData = () => {
    const { dateRange, selectedAccounts, selectedCluster } = useFilters();

    return useQuery<ConsolidatedMetrics, Error>({
        queryKey: ['finance_data', dateRange?.start, dateRange?.end, selectedAccounts, selectedCluster],
        queryFn: async () => {
            if (!dateRange?.start || !dateRange?.end) {
                return summarizeMetrics([]);
            }

            let accountFilter: string[] | null = null;

            if (selectedAccounts.length > 0 && !selectedAccounts.includes('ALL')) {
                accountFilter = selectedAccounts;
            } else if (selectedCluster && selectedCluster !== 'ALL') {
                const { data: clusterAccs } = await (supabase.from as any)('cluster_accounts').select('account_id').eq('cluster_id', selectedCluster);
                accountFilter = clusterAccs?.map((a: any) => a.account_id) || [];
                if (accountFilter.length === 0) accountFilter = ['NONE']; // Prevent fetching all if cluster is empty
            }

            const params = {
                p_start_date: formatDateForDB(dateRange.start),
                p_end_date: formatDateForDB(dateRange.end),
                p_user_email: getUserEmail(),
                p_franchise_filter: null,
                p_account_filter: accountFilter,
            };

            const { data, error } = await supabase.rpc('get_managerial_data', params);

            if (error) {
                throw new Error(error.message);
            }

            const rawData = (data as unknown as RawFinanceData[]) || [];
            return summarizeMetrics(rawData); // The selection/transformation layer inside FSD
        },
        enabled: !!dateRange?.start && !!dateRange?.end,
        staleTime: 5 * 60 * 1000,
    });
};
