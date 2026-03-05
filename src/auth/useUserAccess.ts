import { useMemo } from 'react';
import { UserProfile, ResolvedFranchise, ResolvedMetaAccount } from './types';

interface UseUserAccessReturn {
    // Permissões
    isAdmin: boolean;
    isClient: boolean;

    // Contas e clusters que o usuário pode ver
    allowedAccountIds: string[];       // IDs das contas Meta
    allowedClusterIds: string[];       // IDs dos clusters

    // Helpers de filtragem
    filterAccountsByAccess: (allAccounts: ResolvedMetaAccount[]) => ResolvedMetaAccount[];
}

export const useUserAccess = (userProfile: UserProfile | null): UseUserAccessReturn => {
    return useMemo(() => {
        const isAdmin = userProfile?.role === 'admin';
        const isClient = userProfile?.role === 'client';

        // IDs de contas e clusters permitidos
        const allowedAccountIds = userProfile?.assigned_account_ids || [];
        const allowedClusterIds = userProfile?.assigned_cluster_ids || [];

        const filterAccountsByAccess = (allAccounts: ResolvedMetaAccount[]) => {
            if (!userProfile) return [];

            // Filtro Global de Visibilidade: remove contas ocultas no sistema
            const visibleAccounts = allAccounts.filter(acc => acc.client_visibility !== false);

            if (isAdmin) return visibleAccounts;

            return visibleAccounts.filter(acc => {
                // Checar se a conta está explicitamente permitida
                if (allowedAccountIds.includes(acc.id) || allowedAccountIds.includes(acc.account_id)) return true;
                return false;
            });
        };

        return {
            isAdmin,
            isClient,
            allowedAccountIds,
            allowedClusterIds,
            filterAccountsByAccess
        };
    }, [userProfile]);
};
