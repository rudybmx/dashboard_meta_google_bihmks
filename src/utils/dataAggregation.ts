import { CampaignData } from '../../types';

export interface HierarchyNode {
  id: string; // unique key
  name: string;
  type: 'campaign' | 'adset' | 'ad';
  status: string;
  imageUrl?: string;
  
  // Base Metrics
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
  
  // Calculated Metrics
  ctr: number;
  cpc: number;
  cpl: number;
  roas: number;

  children?: HierarchyNode[];
}

export const buildCampaignHierarchy = (data: CampaignData[]): HierarchyNode[] => {
  // Helper to init node
  const createNode = (id: string, name: string, type: 'campaign' | 'adset' | 'ad', status: string = 'active', imageUrl?: string) => ({
    id,
    name,
    type,
    status,
    imageUrl,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    purchases: 0,
    ctr: 0,
    cpc: 0,
    cpl: 0,
    roas: 0,
    children: [] as HierarchyNode[]
  });

  // Helper to re-calculate rates
  const updateRates = (node: HierarchyNode) => {
      node.ctr = node.impressions > 0 ? (node.clicks / node.impressions) * 100 : 0;
      node.cpc = node.clicks > 0 ? node.spend / node.clicks : 0;
      node.cpl = node.leads > 0 ? node.spend / node.leads : 0;
      node.roas = 0; // Standardize
  };

  const hierarchy: HierarchyNode[] = [];
  const hierarchyMap = new Map<string, HierarchyNode>(); // Campaign ID -> Node

  data.forEach(row => {
      const campaignName = row.campaign_name || 'Campanha Desconhecida';
      const adSetName = row.adset_name || 'Conjunto Desconhecido';
      const adName = row.ad_name || 'Anúncio Desconhecido';

      const campaignId = `cmp-${campaignName}`;
      const adSetId = `ads-${campaignName}-${adSetName}`;
      const adId = row.unique_id || `ad-${Math.random()}`; // Fallback ID

      // 1. Campaign
      let cmpNode = hierarchyMap.get(campaignId);
      if (!cmpNode) {
          cmpNode = createNode(campaignId, campaignName, 'campaign');
          hierarchyMap.set(campaignId, cmpNode);
          hierarchy.push(cmpNode);
      }

      // 2. AdSet
      let adSetNode = cmpNode.children!.find(c => c.id === adSetId);
      if (!adSetNode) {
          adSetNode = createNode(adSetId, adSetName, 'adset');
          cmpNode.children!.push(adSetNode);
      }

      // 3. Ad (Leaf)
      const adNode = createNode(adId, adName, 'ad', 'active', row.ad_image_url);
      adNode.spend = row.valor_gasto || 0;
      adNode.impressions = row.impressoes || 0;
      adNode.clicks = row.cliques_todos || 0;
      adNode.leads = row.msgs_iniciadas || 0;
      adNode.purchases = row.compras || 0;
      updateRates(adNode);

      adSetNode.children!.push(adNode);

      // Aggregate Up to AdSet
      adSetNode.spend += adNode.spend;
      adSetNode.impressions += adNode.impressions;
      adSetNode.clicks += adNode.clicks;
      adSetNode.leads += adNode.leads;
      adSetNode.purchases += adNode.purchases;
      
      // Aggregate Up to Campaign
      cmpNode.spend += adNode.spend;
      cmpNode.impressions += adNode.impressions;
      cmpNode.clicks += adNode.clicks;
      cmpNode.leads += adNode.leads;
      cmpNode.purchases += adNode.purchases;
  });

  // Final Pass: Update Rates for aggregated nodes
  hierarchy.forEach(cmp => {
      updateRates(cmp);
      cmp.children?.forEach(adset => {
          updateRates(adset);
      });
  });

  return hierarchy;
};
