export { supabase } from './supabaseClient';
import { supabase } from './supabaseClient';
import { CampaignData, SummaryReportRow } from '../types';
import { format } from 'date-fns';
import { MOCK_DATA } from '../constants';
import { Database } from '../types/database.types';

// Tipos auxiliares para evitar 'any'
type ViewRow = Database['public']['Views']['vw_dashboard_unified']['Row'];
type AccountConfigInsert = Database['public']['Tables']['accounts_config']['Insert'];
type FranchiseRow = Database['public']['Tables']['tb_franqueados']['Row'];
type MetaAccountUpdate = Database['public']['Tables']['tb_meta_ads_contas']['Update'];

// Tabela/View no Supabase
const VIEW_NAME = 'vw_dashboard_unified';

import { getPreviousPeriod, formatDateForDB } from '../lib/dateUtils';

// ... (existing fetchCampaignData logic tailored for Charts/Table remains)

// --- HELPER: Centralized User Access Profile Fetch ---
export const fetchUserProfile = async (email: string | undefined) => {
    if (!email) return null;
    try {
        const { data, error } = await supabase
            .from('perfil_acesso')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            console.warn("Error fetching perfil_acesso:", error);
            return null;
        }
        if (!data) return null;

        // Map DB 'nome' to App 'name'
        return {
            ...data,
            name: data.nome || email.split('@')[0],
        };
    } catch (err) {
        console.error("Exception fetching profile:", err);
        return null;
    }
};

export const fetchCampaignData = async (
  startDate: Date, 
  endDate: Date
): Promise<{ 
  current: CampaignData[], 
  previous: CampaignData[], 
  isMock: boolean, 
  error: string | null 
}> => {
  try {
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);
    const currentStartStr = formatDateForDB(startDate);
    const currentEndStr = formatDateForDB(endDate);
    const prevStartStr = formatDateForDB(prevStart);
    const prevEndStr = formatDateForDB(prevEnd);

    const { data: { session } } = await supabase.auth.getSession();
    
    // Permission Variables
    let assignedFranchises : string[] = [];
    let assignedAccounts : string[] = [];
    let isAdmin = false;
    let isClient = false;

    if (session?.user?.email) {
        const profile = await fetchUserProfile(session.user.email);
        if (profile) {
            isAdmin = profile.role === 'admin' || profile.role === 'executive';
            isClient = profile.role === 'client';
            assignedFranchises = profile.assigned_franchise_ids || [];
            assignedAccounts = profile.assigned_account_ids || [];
        }
    }

    // Resolve Franchise Names for ID-based filtering (Legacy column 'franqueado' stores Name)
    let allowedFranchiseNames: string[] = [];
    if (!isAdmin && !isClient && assignedFranchises.length > 0) {
        const { data: nameData } = await supabase.from('tb_franqueados').select('nome').in('id', assignedFranchises);
        if (nameData) allowedFranchiseNames = nameData.map(f => f.nome).filter(n => n !== null) as string[];
    }

    // Helper to build a query
    const buildQuery = (start: string, end: string) => {
        let q = supabase.from(VIEW_NAME).select('*')
            .gte('date_start', start)
            .lte('date_start', end);
        
        // 1. Client Level Filter (Highest Priority)
        if (!isAdmin && (isClient || assignedAccounts.length > 0)) {
            // If user has specific accounts assigned, restrict to them ONLY.
            // (Even if they technically have franchise IDs, account level is more granular)
             if (assignedAccounts.length > 0) {
                q = q.in('account_id', assignedAccounts);
             } else {
                // Client with no accounts? Block access.
                q = q.in('account_id', ['__NO_ACCESS__']);
             }
        } 
        // 2. Franchise Level Filter
        else if (!isAdmin && allowedFranchiseNames.length > 0) {
            q = q.in('franqueado', allowedFranchiseNames);
        } 
        // 3. Fallback Block
        else if (!isAdmin) {
             // Not admin, no accounts, no franchises -> Block
             q = q.in('franqueado', ['__NO_ACCESS__']);
        }
        
        return q;
    };

    const [currRes, prevRes] = await Promise.all([
        buildQuery(currentStartStr, currentEndStr),
        buildQuery(prevStartStr, prevEndStr)
    ]);

    if (currRes.error) throw new Error(`Current Query Error: ${currRes.error.message}`);
    if (prevRes.error) throw new Error(`Previous Query Error: ${prevRes.error.message}`);

    const currentDataRaw = currRes.data || [];
    const previousDataRaw = prevRes.data || [];

    const mapRow = (row: ViewRow): CampaignData => ({
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
      target_idade_min: row.target_idade_min || undefined,
      target_idade_max: row.target_idade_max || undefined,
      ad_image_url: row.ad_image_url || undefined,
      ad_title: row.ad_title || undefined,
      ad_body: row.ad_body || undefined,
      ad_destination_url: row.ad_destination_url || undefined,
      ad_cta: row.ad_cta || undefined,
      ad_post_link: row.ad_post_link || undefined
    });

    return { 
        current: currentDataRaw.map(mapRow),
        previous: previousDataRaw.map(mapRow),
        isMock: false, 
        error: null 
    };

  } catch (err: any) {
    console.error('Falha ao buscar dados do Supabase:', err);
    return { current: [], previous: [], isMock: true, error: err.message || 'Erro desconhecido' };
  }
};

/**
 * Fetches aggregated KPI comparison directly from Database RPC.
 * Guaranteed to be accurate for MoM calculations.
 */
export const fetchKPIComparison = async (startDate: Date, endDate: Date) => {
    try {
        const { start: prevStart, end: prevEnd } = getPreviousPeriod(startDate, endDate);
        const { data: { session } } = await supabase.auth.getSession();
        
        // RBAC logic
        let franchiseFilter: string[] | null = null;
        let accountFilter: string[] | null = null;

        if (session?.user?.email) {
            const profile = await fetchUserProfile(session.user.email);

            if (profile) {
                const isAdmin = profile.role === 'admin' || profile.role === 'executive';
                const isClient = profile.role === 'client';

                if (!isAdmin) {
                    // Client Level
                    if (isClient || (profile.assigned_account_ids && profile.assigned_account_ids.length > 0)) {
                         accountFilter = profile.assigned_account_ids || ['__NO_ACCESS__'];
                    } 
                    // Franchise Level
                    else {
                        const assigned = profile.assigned_franchise_ids || [];
                        if (assigned.length > 0) {
                             const { data: nameData } = await supabase.from('tb_franqueados').select('nome').in('id', assigned);
                             if (nameData) franchiseFilter = nameData.map(f => f.nome).filter(Boolean) as string[];
                        } else {
                            franchiseFilter = ['__NO_ACCESS__']; 
                        }
                    }
                }
            }
        }

        const { data, error } = await supabase.rpc('get_kpi_comparison', {
            p_start_date: formatDateForDB(startDate),
            p_end_date: formatDateForDB(endDate),
            p_prev_start_date: formatDateForDB(prevStart),
            p_prev_end_date: formatDateForDB(prevEnd),
            p_franchise_filter: franchiseFilter,
            p_account_filter: accountFilter // New Parameter
        });

        if (error) {
            console.error("KPI RPC Error:", error);
            return null; // Fallback to frontend calc
        }

        return data[0]; // Returns single row { current_spend, prev_spend... }

    } catch (err) {
        console.error("KPI Fetch Failed:", err);
        return null;
    }
};

export const fetchSummaryReport = async (startDate: Date, endDate: Date): Promise<SummaryReportRow[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return [];

        const user = await fetchUserProfile(session.user.email);
        
        let franchiseFilter: string[] | null = null;
        let accountFilter: string[] | null = null;

        if (user) {
            if (user.role === 'admin' || user.role === 'executive') {
                // No filters
            } else if (user.role === 'multifranqueado' || user.role === 'franqueado') {
                franchiseFilter = user.assigned_franchise_ids || [];
            } else if (user.role === 'client') {
                accountFilter = user.assigned_account_ids || [];
            }
        }

        const { data, error } = await supabase.rpc('get_managerial_data', {
            p_start_date: format(startDate, 'yyyy-MM-dd'),
            p_end_date: format(endDate, 'yyyy-MM-dd'),
            p_franchise_filter: franchiseFilter,
            p_account_filter: accountFilter
        });

        if (error) {
            console.error("Summary Report RPC Error:", error);
            throw error;
        }

        return data || [];

    } catch (err) {
        console.error("Summary Fetch Failed:", err);
        return [];
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

// Helper to safely parse localized currency strings (PT-BR or US) or numbers
const safeFloat = (val: string | number | null | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    
    // Clean string
    let str = String(val).trim();
    if (str.startsWith('R$')) str = str.replace('R$', '').trim();
    
    // Heuristic: If it has a comma, assume PT-BR (1.000,00)
    // We only strip dots if a comma is present, protecting "1000.50" (US)
    if (str.includes(',')) {
       str = str.replace(/\./g, '').replace(',', '.');
    } 
    // Else, assume standard float (1000.00) or integer, so do NOT strip dots.
    
    return parseFloat(str) || 0;
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
        current_balance: safeFloat(row.saldo_balanco),
        last_sync: row.updated_at || new Date().toISOString(),
        status_meta: row.status_meta || undefined,
        motivo_bloqueio: row.motivo_bloqueio || undefined,
        total_gasto: safeFloat(row.total_gasto),
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