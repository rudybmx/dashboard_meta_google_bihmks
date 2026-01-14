export { supabase } from './supabaseClient';
import { supabase } from './supabaseClient';
import { CampaignData } from '../types';
import { MOCK_DATA } from '../constants';
import { Database } from '../types/database.types';

// Tipos auxiliares para evitar 'any'
type ViewRow = Database['public']['Views']['vw_dashboard_unified']['Row'];
type AccountConfigInsert = Database['public']['Tables']['accounts_config']['Insert'];
type FranchiseRow = Database['public']['Tables']['tb_franqueados']['Row'];
type MetaAccountUpdate = Database['public']['Tables']['tb_meta_ads_contas']['Update'];

// Tabela/View no Supabase
const VIEW_NAME = 'vw_dashboard_unified';

export const fetchCampaignData = async (): Promise<{ data: CampaignData[], isMock: boolean, error: string | null }> => {
  try {
    // Busca direta da View com dados já tratados
    // O tipo é inferido automaticamente do cliente tipado
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

    // Map DBRow (nullable) -> CampaignData (strict)
    const mappedData: CampaignData[] = data.map((row: ViewRow) => ({
      unique_id: row.unique_id || `gen-${Math.random()}`,
      franqueado: row.franqueado || '',
      account_id: row.account_id || '',
      account_name: row.account_name || '',
      ad_id: row.ad_id || '',
      date_start: row.date_start || '', 
      campaign_name: row.campaign_name || '',
      adset_name: row.adset_name || undefined,
      ad_name: row.ad_name || undefined,
      objective: row.objective || undefined,

      // Numeric Fields (Handle nulls with 0)
      valor_gasto: row.valor_gasto || 0,
      cpc: row.cpc || 0,
      ctr: row.ctr || 0,
      cpm: row.cpm || 0,
      frequencia: row.frequencia || 0,
      custo_por_lead: row.custo_por_lead || 0,
      custo_por_compra: row.custo_por_compra || 0,
      alcance: row.alcance || 0,
      impressoes: row.impressoes || 0,
      cliques_todos: row.cliques_todos || 0,
      leads_total: row.leads_total || 0,
      compras: row.compras || 0,
      msgs_iniciadas: row.msgs_iniciadas || 0,
      msgs_conexoes: row.msgs_conexoes || 0,
      msgs_novos_contatos: row.msgs_novos_contatos || 0,
      msgs_profundidade_2: row.msgs_profundidade_2 || 0,
      msgs_profundidade_3: row.msgs_profundidade_3 || 0,

      // Strings
      target_plataformas: row.target_plataformas || '',
      target_interesses: row.target_interesses || undefined,
      target_familia: row.target_familia || undefined,
      target_comportamentos: row.target_comportamentos || undefined,
      target_publicos_custom: row.target_publicos_custom || undefined,
      target_local_1: row.target_local_1 || undefined,
      target_local_2: row.target_local_2 || undefined,
      target_local_3: row.target_local_3 || undefined,
      target_tipo_local: row.target_tipo_local || undefined,
      target_brand_safety: row.target_brand_safety || undefined,
      target_posicao_fb: row.target_posicao_fb || undefined,
      target_posicao_ig: row.target_posicao_ig || undefined,
      
      // Numbers nullable
      target_idade_min: row.target_idade_min || undefined,
      target_idade_max: row.target_idade_max || undefined,

      // Creative
      ad_image_url: row.ad_image_url || undefined,
      ad_title: row.ad_title || undefined,
      ad_body: row.ad_body || undefined,
      ad_destination_url: row.ad_destination_url || undefined,
      ad_cta: row.ad_cta || undefined,
      ad_post_link: row.ad_post_link || undefined
    }));

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

export const saveAccountConfig = async (account: AccountConfigInsert) => {
    const { data, error } = await supabase
        .from('accounts_config')
        .insert([account])
        .select();

    if (error) throw error;
    return data;
};

export const addAccountConfig = async (config: AccountConfigInsert) => {
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
      .select('*') 
      .order('nome_original', { ascending: true });

    if (error) {
        console.error('Error fetching meta accounts:', error);
        return [];
    }

    // Map DB columns to Frontend Interface
    return data.map(row => ({
        id: row.account_id, // PK is account_id
        account_id: row.account_id,
        account_name: row.nome_original || 'Sem Nome',
        display_name: row.nome_ajustado || '',
        franchise_id: row.franqueado || '', // Storing Name as ID/Link for now based on legacy text column
        status: (row.status_interno === 'removed' ? 'removed' : 'active') as 'removed' | 'active',
        client_visibility: row.client_visibility ?? true, // Default true
        current_balance: parseFloat((row.saldo_balanco || '0').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0,
        last_sync: row.updated_at || new Date().toISOString(),
        status_meta: row.status_meta || undefined,
        motivo_bloqueio: row.motivo_bloqueio || undefined,
        total_gasto: parseFloat(String(row.total_gasto || '0').replace(/[^0-9,.-]+/g, "").replace('.', '').replace(',', '.')) || 0,
        status_interno: row.status_interno || 'A Classificar'
    }));
};

export const updateMetaAccount = async (id: string, updates: Partial<any>) => {
    // Reverse Map Frontend -> DB (Manual mapping still needed as logic is custom)
    const dbUpdates: MetaAccountUpdate = {};
    
    if (updates.display_name !== undefined) dbUpdates.nome_ajustado = updates.display_name;
    if (updates.status_interno !== undefined) dbUpdates.status_interno = updates.status_interno;
    if (updates.franchise_id !== undefined) dbUpdates.franqueado = updates.franchise_id;
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

      return (data || []).map((f: FranchiseRow) => ({
          id: f.id, 
          name: f.nome || 'Sem Nome', // Map DB 'nome' -> UI 'name'
          active: f.ativo || false
      }));

};

export const createFranchise = async (name: string) => {
    const { data, error } = await supabase
        .from('tb_franqueados')
        .insert([{ nome: name, ativo: true }])
        .select()
        .single();
    
    if (error) throw error;
    return {
        id: data.id,
        name: data.nome || '',
        active: data.ativo || false
    };
};

export const toggleFranchiseStatus = async (id: string, active: boolean) => {
    const { error } = await supabase
        .from('tb_franqueados')
        .update({ ativo: active })
        .eq('id', id);
        
    if (error) throw error;
};