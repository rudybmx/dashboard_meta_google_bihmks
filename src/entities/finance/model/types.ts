export interface RawFinanceData {
    meta_account_id: string;
    nome_conta: string;
    franquia: string;
    saldo_atual: number;
    investimento: number;
    leads: number; // Represents 'Leads Geral'
    leads_cadastro: number; // Represents 'Leads de Cadastro'
    compras: number;
    conversas: number; // Represents 'Leads de Mensagem'
    clicks: number;
    impressoes: number;
    alcance: number;
}

export interface ConsolidatedMetrics {
    spend: number;
    leads: number; // 'Leads Geral'
    leads_cadastro: number; // 'Leads de Cadastro'
    purchases: number;
    conversations: number; // 'Leads de Mensagem'
    clicks: number;
    impressions: number;
    reach: number;
    cpl: number; // Calculated using 'Leads Geral'
    ctr: number;
    rawData: RawFinanceData[];
}
