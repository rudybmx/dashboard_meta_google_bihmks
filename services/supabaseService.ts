import { supabase } from './supabaseClient';
import { CampaignData, Platform } from '../types';
import { MOCK_DATA } from '../constants';

// Tabela/View no Supabase
const VIEW_NAME = 'vw_dashboard_unified';

export const fetchCampaignData = async (): Promise<{ data: CampaignData[], isMock: boolean, error: string | null }> => {
  try {
    // Busca direta da View com dados já tratados
    const { data, error } = await supabase
      .from(VIEW_NAME)
      .select('*');

    // Se houver erro de API
    if (error) {
      console.error('Supabase API Error:', JSON.stringify(error, null, 2));
      throw new Error(`Erro Supabase: ${error.message} (${error.code || 'Unknown Code'})`);
    }

    // Se a tabela/view estiver vazia
    if (!data || data.length === 0) {
      console.warn(`View '${VIEW_NAME}' está vazia. Usando dados de teste.`);
      return { data: MOCK_DATA, isMock: true, error: 'Tabela vazia' };
    }

    // O dado já vem limpo e tipado do Postgres (View)
    // Apenas fazemos o cast para garantir a interface do TS
    const mappedData = data as unknown as CampaignData[];

    return { data: mappedData, isMock: false, error: null };

  } catch (err: any) {
    console.error('Falha ao buscar dados do Supabase:', err);
    return { data: MOCK_DATA, isMock: true, error: err.message || 'Erro desconhecido' };
  }
};

export const fetchAccountsConfig = async () => {
    const { data, error } = await supabase
        .from('accounts_config')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const saveAccountConfig = async (account: {
    account_id: string;
    account_name: string;
    franqueado: string;
    nome_ajustado?: string;
}) => {
    const { data, error } = await supabase
        .from('accounts_config')
        .insert([account])
        .select();

    if (error) throw error;
    return data;
};

export const addAccountConfig = async (config: Omit<any, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('accounts_config')
      .insert(config)
      .select()
      .single();

    if (error) throw error;
    return data;
};

// BM Settings (tb_meta_ads_contas)
export const fetchMetaAccounts = async () => {
    const { data, error } = await supabase
      .from('tb_meta_ads_contas')
      .select('*, status_meta, motivo_bloqueio, total_gasto') // Explicit select to bypass potential cache
      .order('nome_original', { ascending: true });

    if (error) {
        console.error('Error fetching meta accounts:', error);
        return [];
    }

    // Map DB columns to Frontend Interface
    return data.map((row: any) => ({
        id: row.account_id, // PK is account_id
        account_id: row.account_id,
        account_name: row.nome_original || 'Sem Nome',
        display_name: row.nome_ajustado || '',
        franchise_id: row.franqueado, // Storing Name as ID/Link for now based on legacy text column
        status: row.status_interno === 'removed' ? 'removed' : 'active', // Map status
        client_visibility: row.client_visibility ?? true, // Default true
        current_balance: parseFloat((row.saldo_balanco || '0').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0,
        last_sync: row.updated_at || new Date().toISOString(),
        status_meta: row.status_meta || row.Status_Meta,
        motivo_bloqueio: row.motivo_bloqueio,
        total_gasto: parseFloat(String(row.total_gasto || '0').replace(/[^0-9,.-]+/g, "").replace('.', '').replace(',', '.')) || 0,
        status_interno: row.status_interno || 'A Classificar'
    }));
};

export const updateMetaAccount = async (id: string, updates: Partial<any>) => {
    // Reverse Map Frontend -> DB
    const dbUpdates: any = {};
    if (updates.display_name !== undefined) dbUpdates.nome_ajustado = updates.display_name;
    if (updates.status_interno !== undefined) dbUpdates.status_interno = updates.status_interno;
    if (updates.franchise_id !== undefined) dbUpdates.franqueado = updates.franchise_id; // Storing Name
    if (updates.client_visibility !== undefined) dbUpdates.client_visibility = updates.client_visibility;
    if (updates.status !== undefined) dbUpdates.status_interno = updates.status;

    const { data, error } = await supabase
      .from('tb_meta_ads_contas')
      .update(dbUpdates)
      .eq('account_id', id) // PK is account_id
      .select()
      .single();
      
    if (error) throw error;
    return data;
};

export const fetchFranchises = async () => {
      const { data, error } = await supabase
        .from('tb_franqueados')
        .select('*')
        .order('nome'); // Order by 'nome' which is the actual column
        
      if (error) {
          console.error('Error fetching franchises:', error);
          return [];
      }

      return (data || []).map((f: any) => ({
          id: f.id, 
          name: f.nome, // Map DB 'nome' -> UI 'name'
          active: f.ativo
      }));

};

export const createFranchise = async (name: string) => {
    const { data, error } = await supabase
        .from('tb_franqueados')
        .insert([{ nome: name }])
        .select()
        .single();
    
    if (error) throw error;
    return {
        id: data.id,
        name: data.nome,
        active: data.active
    };
};

export const toggleFranchiseStatus = async (id: string, active: boolean) => {
    const { error } = await supabase
        .from('tb_franqueados')
        .update({ ativo: active })
        .eq('id', id);
        
    if (error) throw error;
};