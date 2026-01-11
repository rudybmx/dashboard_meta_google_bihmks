import { CampaignData, Platform } from '../types';

const SHEET_ID = '143fPnZ2ZJJ0cyEStMfrreTM_C8aWh1DSsZQOa0ugvMc';
const SHEET_NAME = 'Insights'; // User specified tab
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

// Helper to clean numeric values (e.g. "1.250,50" -> 1250.50 or "$100" -> 100)
const parseNumber = (value: string): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const clean = value.replace(/[^0-9,.-]/g, '');
  return parseFloat(clean.replace(',', '.'));
};

// CSV Line Parser handling quotes
const parseCSVLine = (text: string) => {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result.map(x => x.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
};

export const fetchCampaignData = async (): Promise<CampaignData[]> => {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error('Failed to fetch data from Google Sheets');
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) return [];

    // Normalize headers: lowercase, remove special chars, trim
    const headers = parseCSVLine(lines[0]).map(h => (h || '').toLowerCase().trim());
    
    // Smart Column Finder with Priority:
    // 1. Exact Match
    // 2. Includes (but stricter)
    const findCol = (keywords: string[]) => {
      // Try exact match first
      let idx = headers.findIndex(h => keywords.includes(h));
      if (idx !== -1) return idx;

      // Try contains match
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    // Specific mapping to avoid collisions (e.g. 'conta' vs 'contato')
    const colMap = {
      franqueado: findCol(['franqueado', 'unidade', 'franchise']),
      account: findCol(['account name', 'account_name', 'nome da conta', 'conta']),
      campaign: findCol(['campaign name', 'campaign_name', 'nome da campanha', 'campanha']),
      date: findCol(['day', 'date', 'data', 'dia']),
      spend: findCol(['amount spent', 'valor gasto', 'investimento', 'spend', 'gasto']),
      impressions: findCol(['impressions', 'impressoes']),
      clicks: findCol(['link clicks', 'cliques no link', 'cliques', 'clicks']),
      leads: findCol(['leads', 'cadastros', 'cadastro']),
      
      // Funnel metrics - specific keywords to avoid mixing 'started' with 'contacts'
      msgs_started: findCol(['conversas iniciadas', 'msgs_iniciadas', 'messaging conversations started']),
      msgs_connected: findCol(['conexoes', 'msgs_conexoes', 'conexões']), 
      msgs_contact: findCol(['novos contatos', 'msgs_novos_contatos', 'new messaging contacts']),
      
      platform: findCol(['platform', 'plataforma', 'publisher platform']),
      image: findCol(['ad image url', 'image', 'imagem', 'url da imagem', 'creative_url']),
      title: findCol(['ad headline', 'titulo', 'headline', 'título']),
      post_link: findCol(['ad_post_link', 'preview_link', 'link_do_anuncio', 'permalink', 'url_do_post']),
      city: findCol(['city', 'cidade']),
      age_min: findCol(['age_min', 'idade_min']),
      age_max: findCol(['age_max', 'idade_max'])
    };

    const data: CampaignData[] = lines.slice(1).map((line, idx) => {
      const row = parseCSVLine(line);
      const getVal = (index: number) => {
        if (index === -1) return '';
        const val = row[index];
        return val === undefined ? '' : val;
      };

      const spend = parseNumber(getVal(colMap.spend));
      const leads = parseNumber(getVal(colMap.leads));
      const impressions = parseNumber(getVal(colMap.impressions));
      const clicks = parseNumber(getVal(colMap.clicks));
      
      // Platform logic
      let platformRaw = getVal(colMap.platform).toLowerCase();
      let platform: Platform = 'facebook';
      if (platformRaw.includes('insta')) platform = 'instagram';
      else if (platformRaw.includes('google')) platform = 'google';
      else if (platformRaw.includes('audience')) platform = 'audience_network';

      // Fallback for ID creation
      const dateVal = getVal(colMap.date) || new Date().toISOString().split('T')[0];
      const campName = getVal(colMap.campaign) || 'Campanha Geral';

      return {
        unique_id: `row-${idx}-${dateVal}`,
        franqueado: getVal(colMap.franqueado) || 'Franquia Geral',
        account_id: `sheet-acc-${idx}`, // Generated ID
        account_name: getVal(colMap.account) || 'Conta Desconhecida',
        ad_id: `sheet-ad-${idx}`, // Generated ID
        campaign_name: campName,
        date_start: dateVal,
        valor_gasto: spend,
        
        // Metrics
        impressoes: impressions,
        cliques_todos: clicks,
        leads_total: leads,
        compras: 0, // Not mapped in colMap
        msgs_iniciadas: parseNumber(getVal(colMap.msgs_started)),
        msgs_conexoes: parseNumber(getVal(colMap.msgs_connected)),
        msgs_novos_contatos: parseNumber(getVal(colMap.msgs_contact)),
        msgs_profundidade_2: 0,
        msgs_profundidade_3: 0,
        
        alcance: 0,
        frequencia: 0,
        cpm: 0,
        custo_por_compra: 0, // or calculate it?

        target_plataformas: platform,
        ad_image_url: getVal(colMap.image),
        ad_title: getVal(colMap.title) || campName,
        ad_post_link: getVal(colMap.post_link),
        target_local_1: getVal(colMap.city),
        target_idade_min: parseNumber(getVal(colMap.age_min)),
        target_idade_max: parseNumber(getVal(colMap.age_max)),
        
        // Calculated
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        custo_por_lead: leads > 0 ? spend / leads : 0,
      };
    });

    return data;
  } catch (error) {
    console.error("Sheet Fetch Error:", error);
    return [];
  }
};