export interface Cluster {
    id: string;
    name: string;
    created_at: string;
    cluster_accounts?: { account_id: string }[];
}

export interface ClusterAccount {
    cluster_id: string;
    account_id: string;
    meta_account?: {
        account_id: string;
        nome_original: string;
        nome_ajustado: string;
    };
}

export interface ClusterMetrics {
    cluster_id: string;
    nome_conta: string;
    investimento: number;
    leads: number;
    leads_cadastro: number;
    compras: number;
    conversas: number;
    clicks: number;
    impressoes: number;
    alcance: number;
    cpl_conversas: number;
    cpl_compras: number;
    cpl_total: number;
}
