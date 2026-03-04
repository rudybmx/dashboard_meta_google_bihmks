// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { Cluster, ClusterAccount, ClusterMetrics } from '../model/types';
import { formatDateForDB } from '@/src/shared/lib/dateUtils';
import { useFilters } from '@/src/features/filters';

export const getUserEmail = (): string | null => {
    try {
        const stored = localStorage.getItem('op7_local_session');
        if (!stored) return null;
        const session = JSON.parse(stored);
        return session?.email ?? null;
    } catch {
        return null;
    }
};

export const useClusters = () => {
    return useQuery<Cluster[], Error>({
        queryKey: ['clusters'],
        queryFn: async () => {
            const { data, error } = await supabase.from('clusters').select('*, cluster_accounts(account_id)').order('name');
            if (error) throw new Error(error.message);
            return data as Cluster[];
        }
    });
};

export const useClusterAccounts = (clusterId: string | null) => {
    return useQuery<ClusterAccount[], Error>({
        queryKey: ['cluster_accounts', clusterId],
        queryFn: async () => {
            if (!clusterId) return [];
            const { data, error } = await supabase
                .from('cluster_accounts')
                .select(`
          cluster_id,
          account_id,
          tb_meta_ads_contas(account_id, nome_original, nome_ajustado)
        `)
                .eq('cluster_id', clusterId);

            if (error) throw new Error(error.message);

            return (data as any[]).map(d => ({
                cluster_id: d.cluster_id,
                account_id: d.account_id,
                meta_account: Array.isArray(d.tb_meta_ads_contas) ? d.tb_meta_ads_contas[0] : d.tb_meta_ads_contas
            })) as ClusterAccount[];
        },
        enabled: !!clusterId
    });
};

export const useClusterMetrics = (clusterId: string | null) => {
    const { dateRange } = useFilters();

    return useQuery<ClusterMetrics | null, Error>({
        queryKey: ['cluster_metrics', clusterId, dateRange?.start, dateRange?.end],
        queryFn: async () => {
            if (!clusterId || !dateRange?.start || !dateRange?.end) return null;

            const { data, error } = await supabase.rpc('get_cluster_metrics', {
                p_cluster_id: clusterId,
                p_start_date: formatDateForDB(dateRange.start),
                p_end_date: formatDateForDB(dateRange.end),
                p_user_email: getUserEmail()
            });

            if (error) throw new Error(error.message);
            return (data && data.length > 0) ? (data[0] as ClusterMetrics) : null;
        },
        enabled: !!clusterId && !!dateRange?.start && !!dateRange?.end
    });
};

export const useManageClusters = () => {
    const queryClient = useQueryClient();

    const createCluster = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase.from('clusters').insert({ name }).select().single();
            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clusters'] });
        }
    });

    const deleteCluster = useMutation({
        mutationFn: async (clusterId: string) => {
            const { error } = await supabase.from('clusters').delete().eq('id', clusterId);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clusters'] });
        }
    });

    const linkAccounts = useMutation({
        mutationFn: async ({ clusterId, accountIds }: { clusterId: string, accountIds: string[] }) => {
            // First, remove old
            const { error: delError } = await supabase.from('cluster_accounts').delete().eq('cluster_id', clusterId);
            if (delError) throw new Error(delError.message);

            if (accountIds.length > 0) {
                const inserts = accountIds.map(accountId => ({ cluster_id: clusterId, account_id: accountId }));
                const { error } = await supabase.from('cluster_accounts').insert(inserts);
                if (error) throw new Error(error.message);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cluster_accounts', variables.clusterId] });
        }
    });

    return { createCluster, deleteCluster, linkAccounts };
};
