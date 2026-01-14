import { CampaignData, Platform } from '../types';
import Papa from 'papaparse';

const SHEET_ID = '143fPnZ2ZJJ0cyEStMfrreTM_C8aWh1DSsZQOa0ugvMc';
const SHEET_NAME = 'Insights'; // User specified tab
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// Helper to clean numeric values (e.g. "1.250,50" -> 1250.50 or "$100" -> 100)
const parseNumber = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const clean = value.toString().replace(/[^0-9,.-]/g, '');
  return parseFloat(clean.replace(',', '.')) || 0;
};

export const fetchCampaignData = async (): Promise<CampaignData[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch data from Google Sheets');
    
    const csvText = await response.text();
    
    // Parse using PapaParse for robustness
    const { data: rows, errors } = Papa.parse<any>(csvText, {
      header: true, // Use first row as headers
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.toLowerCase().trim()
    });

    if (errors.length > 0) {
      console.warn('CSV Parse Warnings:', errors);
    }

    if (!rows || rows.length === 0) return [];

    // Get available keys from the first row to create a mapper
    const headers = Object.keys(rows[0]);

    // Smart Column Finder
    const findKey = (keywords: string[]) => {
      // 1. Exact match
      let match = headers.find(h => keywords.includes(h));
      if (match) return match;
      // 2. Partial match
      return headers.find(h => keywords.some(k => h.includes(k)));
    };

    // Map internal fields to CSV headers
    const map = {
      franqueado: findKey(['franqueado', 'unidade', 'franchise']),
      account: findKey(['account name', 'account_name', 'nome da conta', 'conta']),
      campaign: findKey(['campaign name', 'campaign_name', 'nome da campanha', 'campanha']),
      date: findKey(['day', 'date', 'data', 'dia']),
      spend: findKey(['amount spent', 'valor gasto', 'investimento', 'spend', 'gasto']),
      impressions: findKey(['impressions', 'impressoes']),
      clicks: findKey(['link clicks', 'cliques no link', 'cliques', 'clicks']),
      leads: findKey(['leads', 'cadastros', 'cadastro']),
      
      // Funnel
      msgs_started: findKey(['conversas iniciadas', 'msgs_iniciadas', 'messaging conversations started']),
      msgs_connected: findKey(['conexoes', 'msgs_conexoes', 'conexões']), 
      msgs_contact: findKey(['novos contatos', 'msgs_novos_contatos', 'new messaging contacts']),
      
      platform: findKey(['platform', 'plataforma', 'publisher platform']),
      image: findKey(['ad image url', 'image', 'imagem', 'url da imagem', 'creative_url']),
      title: findKey(['ad headline', 'titulo', 'headline', 'título']),
      post_link: findKey(['ad_post_link', 'preview_link', 'link_do_anuncio', 'permalink', 'url_do_post']),
      city: findKey(['city', 'cidade']),
      age_min: findKey(['age_min', 'idade_min']),
      age_max: findKey(['age_max', 'idade_max'])
    };

    const campaignData: CampaignData[] = rows.map((row, idx) => {
      const getVal = (key: string | undefined) => (key && row[key] ? row[key] : '');

      const spend = parseNumber(getVal(map.spend));
      const leads = parseNumber(getVal(map.leads));
      const impressions = parseNumber(getVal(map.impressions));
      const clicks = parseNumber(getVal(map.clicks));
      
      // Platform logic
      let platformRaw = String(getVal(map.platform)).toLowerCase();
      let platform: Platform = 'facebook';
      if (platformRaw.includes('insta')) platform = 'instagram';
      else if (platformRaw.includes('google')) platform = 'google';
      else if (platformRaw.includes('audience')) platform = 'audience_network';

      const dateVal = getVal(map.date) || new Date().toISOString().split('T')[0];
      const campName = getVal(map.campaign) || 'Campanha Geral';

      return {
        unique_id: `sheet-${idx}-${dateVal}`,
        franqueado: getVal(map.franqueado) || 'Franquia Geral',
        account_id: `sheet-acc-${idx}`,
        account_name: getVal(map.account) || 'Conta Desconhecida',
        ad_id: `sheet-ad-${idx}`,
        campaign_name: campName,
        date_start: dateVal,
        valor_gasto: spend,
        
        // Metrics
        impressoes: impressions,
        cliques_todos: clicks,
        leads_total: leads,
        compras: 0,
        msgs_iniciadas: parseNumber(getVal(map.msgs_started)),
        msgs_conexoes: parseNumber(getVal(map.msgs_connected)),
        msgs_novos_contatos: parseNumber(getVal(map.msgs_contact)),
        msgs_profundidade_2: 0,
        msgs_profundidade_3: 0,
        
        alcance: 0,
        frequencia: 0,
        cpm: 0,
        custo_por_compra: 0,

        target_plataformas: platform,
        ad_image_url: getVal(map.image),
        ad_title: getVal(map.title) || campName,
        ad_post_link: getVal(map.post_link),
        target_local_1: getVal(map.city),
        target_idade_min: parseNumber(getVal(map.age_min)),
        target_idade_max: parseNumber(getVal(map.age_max)),
        
        // Calculated
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        custo_por_lead: leads > 0 ? spend / leads : 0,
      };
    });

    return campaignData;
  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    return [];
  }
};