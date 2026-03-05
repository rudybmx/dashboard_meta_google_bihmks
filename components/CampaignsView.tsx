import React, { useMemo, useState } from 'react';
import { CampaignData } from '../types';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Facebook,
  Instagram,
  Chrome,
  ExternalLink,
  X,
  Image as ImageIcon,
  MessageCircle,
  Network
} from 'lucide-react';
import { Input } from "@/src/shared/ui/input";
import { Button } from "@/src/shared/ui/button-1";
import { cn } from "@/src/shared/lib/utils";
import { SafeImage } from '@/src/shared/ui/SafeImage';

interface Props {
  data: CampaignData[];
}

// Hierarchy types
interface AdData {
  ad_id: string;
  ad_name: string;
  ad_image_url: string;
  ad_post_link: string;
  spend: number;
  impressions: number;
  leads: number;
  leads_cadastro: number;
  conversas: number;
  clicks: number;
  purchases: number;
  cpl: number;
  ctr: number;
  cpc: number;
}

interface AdSetData {
  adset_name: string;
  spend: number;
  impressions: number;
  leads: number;
  leads_cadastro: number;
  conversas: number;
  clicks: number;
  purchases: number;
  cpl: number;
  ctr: number;
  cpc: number;
  ads: AdData[];
}

interface CampaignHierarchy {
  campaign_name: string;
  account_name: string;
  objective: string;
  platforms: Set<string>;
  spend: number;
  impressions: number;
  leads: number;
  leads_cadastro: number;
  conversas: number;
  clicks: number;
  purchases: number;
  cpl: number;
  ctr: number;
  cpc: number;
  adsets: AdSetData[];
}

// Build hierarchical data
const buildHierarchy = (data: CampaignData[]): CampaignHierarchy[] => {
  const campaigns: Record<string, CampaignHierarchy> = {};

  data.forEach(row => {
    const campaignKey = `${row.campaign_name}_${row.account_name}`;
    const adsetKey = row.adset_name || 'Sem Conjunto';
    const adKey = row.ad_id?.toString() || row.ad_name || 'Sem Anúncio';

    // Initialize campaign
    if (!campaigns[campaignKey]) {
      campaigns[campaignKey] = {
        campaign_name: row.campaign_name || 'Campanha Desconhecida',
        account_name: row.account_name || '-',
        objective: row.objective || 'Sem Objetivo',
        platforms: new Set(),
        spend: 0,
        impressions: 0,
        leads: 0,
        leads_cadastro: 0,
        conversas: 0,
        clicks: 0,
        purchases: 0,
        cpl: 0,
        ctr: 0,
        cpc: 0,
        adsets: []
      };
    }

    const campaign = campaigns[campaignKey];

    // Add platform
    if (row.target_plataformas) {
      // Handle comma separated if legacy, but usually it's one per row in granular reports
      // or a string in summary. We add to Set to ensure uniqueness.
      campaign.platforms.add(row.target_plataformas.toLowerCase());
    } else {
      campaign.platforms.add('facebook'); // Default
    }

    // Find or create adset
    let adset = campaign.adsets.find(a => a.adset_name === adsetKey);
    if (!adset) {
      adset = {
        adset_name: adsetKey,
        spend: 0,
        impressions: 0,
        leads: 0,
        leads_cadastro: 0,
        conversas: 0,
        clicks: 0,
        purchases: 0,
        cpl: 0,
        ctr: 0,
        cpc: 0,
        ads: []
      };
      campaign.adsets.push(adset);
    }

    // Find or create ad
    let ad = adset.ads.find(a => a.ad_id === adKey);
    if (!ad) {
      ad = {
        ad_id: adKey,
        ad_name: row.ad_name || 'Anúncio Desconhecido',
        ad_image_url: row.ad_image_url || '',
        ad_post_link: row.ad_post_link || '',
        spend: 0,
        impressions: 0,
        leads: 0,
        leads_cadastro: 0,
        conversas: 0,
        clicks: 0,
        purchases: 0,
        cpl: 0,
        ctr: 0,
        cpc: 0
      };
      adset.ads.push(ad);
    }

    // Aggregate values
    const spend = Number(row.valor_gasto || 0);
    const impressions = Number(row.impressoes || 0);
    const clicks = Number(row.cliques_todos || 0);
    const purchases = Number(row.compras || 0);

    // Business Rules (validated with real data):
    //   - leads_total only counts as Leads de Cadastro when objective contains "Cadastro"
    //   - Leads de Mensagem = msgs_iniciadas (all rows)
    //   - Leads Geral = Mensagens + Leads de Cadastro
    const isCadastro = (row.objective || '').toLowerCase().includes('cadastro') || (row.objective || '').toLowerCase().includes('lead');
    const rowLeadsTotal = Number(row.leads_total || 0);
    const rowConversas = Number(row.msgs_iniciadas || 0);
    const rowLeadsCadastro = isCadastro ? rowLeadsTotal : 0;
    const leadsCount = rowConversas + rowLeadsCadastro;

    campaign.spend += spend;
    campaign.impressions += impressions;
    campaign.leads += leadsCount;
    campaign.leads_cadastro += rowLeadsCadastro;
    campaign.conversas += rowConversas;
    campaign.clicks += clicks;
    campaign.purchases += purchases;

    adset.spend += spend;
    adset.impressions += impressions;
    adset.leads += leadsCount;
    adset.leads_cadastro += rowLeadsCadastro;
    adset.conversas += rowConversas;
    adset.clicks += clicks;
    adset.purchases += purchases;

    ad.spend += spend;
    ad.impressions += impressions;
    ad.leads += leadsCount;
    ad.leads_cadastro += rowLeadsCadastro;
    ad.conversas += rowConversas;
    ad.clicks += clicks;
    ad.purchases += purchases;
  });

  // Calculate Calculated Metrics for all levels
  Object.values(campaigns).forEach(campaign => {
    campaign.cpl = campaign.leads > 0 ? campaign.spend / campaign.leads : 0;
    campaign.ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
    campaign.cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;

    campaign.adsets.forEach(adset => {
      adset.cpl = adset.leads > 0 ? adset.spend / adset.leads : 0;
      adset.ctr = adset.impressions > 0 ? (adset.clicks / adset.impressions) * 100 : 0;
      adset.cpc = adset.clicks > 0 ? adset.spend / adset.clicks : 0;

      adset.ads.forEach(ad => {
        ad.cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;
        ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
        ad.cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
      });
    });
  });

  return Object.values(campaigns).sort((a, b) => b.spend - a.spend);
};

// CSV Export
const downloadCSV = (data: CampaignHierarchy[]) => {
  const headers = ["Campanha", "Conjunto", "Anúncio", "Plataformas", "Investimento", "Leads", "CPL", "Impressões"];
  const rows: string[][] = [];

  data.forEach(campaign => {
    const platforms = Array.from(campaign.platforms).join(', ');
    campaign.adsets.forEach(adset => {
      adset.ads.forEach(ad => {
        rows.push([
          `"${campaign.campaign_name.replace(/"/g, '""')}"`,
          `"${adset.adset_name.replace(/"/g, '""')}"`,
          `"${ad.ad_name.replace(/"/g, '""')}"`,
          `"${platforms}"`,
          ad.spend.toFixed(2),
          ad.leads.toString(),
          ad.cpl.toFixed(2),
          ad.impressions.toString()
        ]);
      });
    });
  });

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `campaigns_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Formatters
const fmtCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const fmtNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

// Platform Helper Component
const PlatformIcons = ({ platforms }: { platforms: Set<string> }) => {
  const hasFacebook = platforms.has('facebook');
  const hasInstagram = platforms.has('instagram');
  const hasMessenger = platforms.has('messenger');
  const hasAudience = platforms.has('audience_network');
  const hasGoogle = platforms.has('google'); // Future proof

  return (
    <div className="flex items-center gap-1.5">
      {hasFacebook && (
        <div title="Facebook" className="bg-blue-50 p-1 rounded-full border border-blue-100">
          <Facebook size={14} className="text-blue-600" />
        </div>
      )}
      {hasInstagram && (
        <div title="Instagram" className="bg-pink-50 p-1 rounded-full border border-pink-100">
          <Instagram size={14} className="text-pink-600" />
        </div>
      )}
      {hasMessenger && (
        <div title="Messenger" className="bg-blue-50 p-1 rounded-full border border-blue-100">
          <MessageCircle size={14} className="text-blue-500" />
        </div>
      )}
      {hasAudience && (
        <div title="Audience Network" className="bg-muted p-1 rounded-full border">
          <Network size={14} className="text-muted-foreground" />
        </div>
      )}
      {hasGoogle && (
        <div title="Google" className="bg-green-50 p-1 rounded-full border border-green-100">
          <Chrome size={14} className="text-green-600" />
        </div>
      )}
    </div>
  );
};

export const CampaignsView: React.FC<Props> = ({ data }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [objectiveFilter, setObjectiveFilter] = useState('');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Process Data
  const hierarchyData = useMemo(() => buildHierarchy(data), [data]);

  // Extract unique objectives
  const uniqueObjectives = useMemo(() => {
    const objectives = new Set<string>();
    hierarchyData.forEach(c => objectives.add(c.objective));
    return Array.from(objectives).sort();
  }, [hierarchyData]);

  // Filter data
  const filteredData = useMemo(() => {
    let result = hierarchyData;

    // Filter by objective
    if (objectiveFilter) {
      result = result.filter(c => c.objective === objectiveFilter);
    }

    // Filter by search text
    if (globalFilter.trim()) {
      const search = globalFilter.toLowerCase();
      result = result.filter(c =>
        c.campaign_name.toLowerCase().includes(search) ||
        c.account_name.toLowerCase().includes(search) ||
        c.adsets.some(a =>
          a.adset_name.toLowerCase().includes(search) ||
          a.ads.some(ad => ad.ad_name.toLowerCase().includes(search))
        )
      );
    }

    return result;
  }, [hierarchyData, globalFilter, objectiveFilter]);

  // Toggle functions
  const toggleCampaign = (key: string) => {
    const next = new Set(expandedCampaigns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedCampaigns(next);
  };

  const toggleAdset = (key: string) => {
    const next = new Set(expandedAdsets);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedAdsets(next);
  };

  // Totals
  const totals = useMemo(() => {
    return filteredData.reduce((acc, c) => ({
      spend: acc.spend + c.spend,
      leads: acc.leads + c.leads,
      leads_cadastro: acc.leads_cadastro + c.leads_cadastro,
      conversas: acc.conversas + c.conversas,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks
    }), { spend: 0, leads: 0, leads_cadastro: 0, conversas: 0, impressions: 0, clicks: 0 });
  }, [filteredData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campanhas</h2>
          <p className="text-sm text-muted-foreground">Hierarquia: Campanha → Conjunto → Anúncio</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              className="pl-8 h-10"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          {/* Objective Filter */}
          <select
            value={objectiveFilter}
            onChange={(e) => setObjectiveFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]"
          >
            <option value="">Todos os Objetivos</option>
            {uniqueObjectives.map(obj => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>
          <Button
            variant="styled"
            type="secondary"
            className="h-10 px-4 gap-2"
            onClick={() => downloadCSV(filteredData)}
          >
            <div><Download size={16} /></div> <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] overflow-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm font-bold text-xs uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left border-b">
                  Campanha / Conjunto / Anúncio
                </th>
                <th className="py-3 px-4 text-left border-b w-[100px]">
                  Plataforma
                </th>
                <th className="py-3 px-4 text-right border-b w-[120px]">
                  Investimento
                </th>
                <th className="py-3 px-4 text-right border-b w-[90px]">
                  Leads Geral
                </th>
                <th className="py-3 px-4 text-right border-b w-[90px]">
                  CPL
                </th>
                <th className="py-3 px-4 text-right border-b w-[100px]">
                  Lds. Cadastro
                </th>
                <th className="py-3 px-4 text-right border-b w-[90px]">
                  Mensagens
                </th>
                <th className="py-3 px-4 text-right border-b w-[80px]">
                  CTR
                </th>
                <th className="py-3 px-4 text-right border-b w-[80px]">
                  CPC
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-32 text-center text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                filteredData.map((campaign, cidx) => {
                  const campaignKey = `${campaign.campaign_name}_${campaign.account_name}`;
                  const isCampaignExpanded = expandedCampaigns.has(campaignKey);

                  return (
                    <React.Fragment key={campaignKey}>
                      {/* Campaign Row */}
                      <tr
                        className={cn(
                          "hover:bg-muted/50 transition-colors border-b",
                          cidx % 2 === 0 ? "bg-card" : "bg-muted/20"
                        )}
                        onClick={() => toggleCampaign(campaignKey)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/60">
                              {isCampaignExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-sm line-clamp-1" title={campaign.campaign_name}>
                                {campaign.campaign_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">{campaign.account_name} • {campaign.adsets.length} conjuntos</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <PlatformIcons platforms={campaign.platforms} />
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-xs">{fmtCurrency(campaign.spend)}</td>
                        <td className="py-3 px-4 text-right font-bold text-xs text-primary">{campaign.leads}</td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">{fmtCurrency(campaign.cpl)}</td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">{campaign.leads_cadastro}</td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">{campaign.conversas}</td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">{campaign.ctr.toFixed(2)}%</td>
                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">{fmtCurrency(campaign.cpc)}</td>
                      </tr>

                      {/* AdSets (Level 2) */}
                      {isCampaignExpanded && campaign.adsets.map((adset, aidx) => {
                        const adsetKey = `${campaignKey}_${adset.adset_name}`;
                        const isAdsetExpanded = expandedAdsets.has(adsetKey);

                        return (
                          <React.Fragment key={adsetKey}>
                            {/* AdSet Row */}
                            <tr
                              className="bg-primary/5 hover:bg-primary/10 transition-colors border-b cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleAdset(adsetKey); }}
                            >
                              <td className="py-2 px-4 pl-10">
                                <div className="flex items-center gap-2">
                                  <span className="text-primary/60">
                                    {isAdsetExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </span>
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground text-xs line-clamp-1" title={adset.adset_name}>
                                      {adset.adset_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{adset.ads.length} anúncios</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 px-4"></td>
                              <td className="py-2 px-4 text-right font-medium text-xs">{fmtCurrency(adset.spend)}</td>
                              <td className="py-2 px-4 text-right font-medium text-primary text-xs">{adset.leads}</td>
                              <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{fmtCurrency(adset.cpl)}</td>
                              <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{adset.leads_cadastro}</td>
                              <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{adset.conversas}</td>
                              <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{adset.ctr.toFixed(2)}%</td>
                              <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{fmtCurrency(adset.cpc)}</td>
                            </tr>

                            {/* Ads (Level 3) */}
                            {isAdsetExpanded && adset.ads.map((ad, adIdx) => (
                              <tr
                                key={ad.ad_id}
                                className="bg-muted/10 hover:bg-muted/30 transition-colors border-b"
                              >
                                <td className="py-2 px-4 pl-16">
                                  <div className="flex items-center gap-3">
                                    {/* Thumbnail */}
                                    {ad.ad_image_url ? (
                                      <div
                                        className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex-shrink-0"
                                        onClick={(e) => { e.stopPropagation(); setLightboxImage(ad.ad_image_url); }}
                                      >
                                        <SafeImage
                                          src={ad.ad_image_url}
                                          alt={ad.ad_name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <ImageIcon size={16} className="text-slate-400" />
                                      </div>
                                    )}
                                    {/* Ad Name */}
                                    <span className="text-muted-foreground text-xs line-clamp-1 flex-1" title={ad.ad_name}>
                                      {ad.ad_name}
                                    </span>
                                    {/* External Link */}
                                    {ad.ad_post_link && (
                                      <a
                                        href={ad.ad_post_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors"
                                        title="Ver anúncio"
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-4"></td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{fmtCurrency(ad.spend)}</td>
                                <td className="py-2 px-4 text-right text-primary/80 text-[10px]">{ad.leads}</td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{fmtCurrency(ad.cpl)}</td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{ad.leads_cadastro}</td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{ad.conversas}</td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{ad.ctr.toFixed(2)}%</td>
                                <td className="py-2 px-4 text-right text-muted-foreground text-[10px]">{fmtCurrency(ad.cpc)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {/* Footer with Totals */}
            <tfoot className="bg-muted/50 font-bold border-t border-muted tracking-tight text-xs">
              <tr>
                <td className="py-3 px-4">Total ({filteredData.length} campanhas)</td>
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-right">{fmtCurrency(totals.spend)}</td>
                <td className="py-3 px-4 text-right text-primary">{totals.leads}</td>
                <td className="py-3 px-4 text-right">{fmtCurrency(totals.leads > 0 ? totals.spend / totals.leads : 0)}</td>
                <td className="py-3 px-4 text-right">{totals.leads_cadastro}</td>
                <td className="py-3 px-4 text-right">{totals.conversas}</td>
                <td className="py-3 px-4 text-right">{totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00'}%</td>
                <td className="py-3 px-4 text-right">{fmtCurrency(totals.clicks > 0 ? totals.spend / totals.clicks : 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              <X size={24} />
            </button>
            <img
              src={lightboxImage}
              alt="Creative"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default CampaignsView;
