/**
 * collect-meta-ads — Supabase Edge Function
 *
 * Substitui o workflow n8n "Insights Dashboard Bihmks Meta".
 * Coleta saldos e insights de todas as contas Meta Ads vinculadas.
 *
 * Trigger: HTTP POST ou pg_cron
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetaAdAccount {
  id: string
  name: string
  amount_spent: number
  spend_cap: number
  balance: number | null
  disable_reason: number
  is_prepay_account: boolean
  account_status: number
  funding_source_details?: {
    display_string: string | null
    id?: number
    type?: string
    last_four?: string
  } | null
  prepaid_amount_info?: {
    amount: { amount: number; currency: string; offset: string } | null
  } | null
}

interface MetaInsightAd {
  account_id: string
  account_name: string
  ad_id: string
  campaign_name: string
  objective: string
  adset_name: string
  ad_name: string
  spend: number
  impressions: number
  clicks: number
  cpc: number
  ctr: number
  cpm: number
  frequency: number
  reach: number
  actions?: Array<{ action_type: string; value: number }>
  date_start: string
  date_stop: string
}

interface MetaAdCreative {
  creative?: {
    name?: string
    title?: string
    body?: string
    image_url?: string
    thumbnail_url?: string
    object_story_spec?: {
      link_data?: {
        picture?: string
        link?: string
        message?: string
        name?: string
        image_url?: string
      }
      video_data?: {
        image_url?: string
        title?: string
        message?: string
      }
    }
    effective_object_story_id?: string
    instagram_permalink_url?: string
    call_to_action_type?: string
  }
  adset?: {
    name?: string
    targeting?: Record<string, unknown>
  }
}

interface DateRange {
  since: string
  until: string
}

interface CollectResult {
  bms_processed: number
  accounts_processed: number
  ads_upserted: number
  errors: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const META_GRAPH_BASE = 'https://graph.facebook.com/v23.0'
const STATUS_MAP: Record<number, string> = {
  1: 'Ativo',
  2: 'Desativado',
  3: 'Não Liquidado (Dívida)',
  7: 'Em Análise',
  8: 'Pendente Liquidação',
  9: 'Período Encerrado',
  100: 'Fechada',
  101: 'Fechada',
}

const OBJECTIVE_MAP: Record<string, string> = {
  OUTCOME_SALES: 'Vendas',
  OUTCOME_LEADS: 'Cadastros (Leads)',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_AWARENESS: 'Reconhecimento',
  MESSAGES: 'Mensagens',
  LEAD_GENERATION: 'Geração de Cadastros',
  CONVERSIONS: 'Conversões',
  LINK_CLICKS: 'Cliques no Link',
  POST_ENGAGEMENT: 'Engajamento em Publicações',
  PAGE_LIKES: 'Curtidas na Página',
  REACH: 'Alcance',
  BRAND_AWARENESS: 'Reconhecimento de Marca',
  VIDEO_VIEWS: 'Visualizações de Vídeo',
  EVENT_RESPONSES: 'Respostas ao Evento',
  OFFER_CLAIMS: 'Resgates de Oferta',
  STORE_VISITS: 'Visitas à Loja',
  APP_INSTALLS: 'Instalações de App',
}

const ACTIONS_MAP: Record<string, string> = {
  lead: 'leads_total',
  'onsite_conversion.messaging_conversation_started_7d': 'msgs_iniciadas',
  'onsite_conversion.total_messaging_connection': 'msgs_conexoes',
  'onsite_conversion.messaging_first_reply': 'msgs_novos_contatos',
  'onsite_conversion.messaging_user_depth_2_message_send': 'msgs_profundidade_2',
  'onsite_conversion.messaging_user_depth_3_message_send': 'msgs_profundidade_3',
  purchase: 'compras',
  complete_registration: 'cadastros_concluidos',
  link_click: 'cliques_link',
  post: 'publicacoes',
  post_reaction: 'reacoes',
  comment: 'comentarios',
  like: 'curtidas',
  share: 'compartilhamentos',
  'onsite_conversion.post_save': 'salvamentos',
  'video_view': 'visualizacoes_video',
  'omni_purchase': 'compras_omni',
  'landing_page_view': 'visitas_landing_page',
  'content_view': 'visualizacoes_conteudo',
  'search': 'buscas',
  'contact': 'contatos',
  'schedule': 'agendamentos',
  'submit_application': 'envios_candidatura',
  'add_to_cart': 'adicoes_carrinho',
  'add_to_wishlist': 'adicoes_lista_desejos',
  'initiate_checkout': 'inicializacoes_checkout',
  'add_payment_info': 'adicoes_pagamento',
  'subscribe': 'inscricoes',
  'start_trial': 'inicializacoes_teste',
  'donate': 'doacoes',
}

const INSIGHT_FIELDS = [
  'account_id',
  'account_name',
  'ad_id',
  'campaign_name',
  'objective',
  'adset_name',
  'ad_name',
  'spend',
  'impressions',
  'clicks',
  'cpc',
  'ctr',
  'cpm',
  'frequency',
  'reach',
  'actions',
  'date_start',
  'date_stop',
]

const AD_FIELDS = [
  'creative{name,title,body,image_url,thumbnail_url,object_story_spec{link_data{picture,link,message,name,image_url},video_data{image_url,title,message}},effective_object_story_id,instagram_permalink_url,call_to_action_type}',
  'adset{name,targeting}',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSaldo(adAccount: MetaAdAccount): string | null {
  // 1. display_string
  const display = adAccount.funding_source_details?.display_string
  if (display) {
    const match = display.match(/R\$\s?([\d.,]+)/)
    if (match) {
      const cleaned = match[1].replace(/\./g, '').replace(',', '.')
      const val = parseFloat(cleaned)
      if (!isNaN(val)) return val.toFixed(2)
    }
  }

  // 2. prepaid_amount_info.amount.amount (nested)
  const prepaidAmount = adAccount.prepaid_amount_info?.amount?.amount
  if (prepaidAmount != null) {
    return (prepaidAmount / 100).toFixed(2)
  }

  // 3. spend_cap - amount_spent
  if (adAccount.spend_cap > 0) {
    return ((adAccount.spend_cap - adAccount.amount_spent) / 100).toFixed(2)
  }

  return null
}

function statusMap(code: number): string {
  return STATUS_MAP[code] ?? `Código ${code}`
}

function translateObjective(raw: string): string {
  return OBJECTIVE_MAP[raw] ?? raw
}

function parseActions(actions?: Array<{ action_type: string; value: number }>): Record<string, number> {
  const result: Record<string, number> = {}
  if (!actions) return result

  for (const action of actions) {
    const column = ACTIONS_MAP[action.action_type]
    if (column) {
      result[column] = parseInt(String(action.value), 10)
    }
  }
  return result
}

function generateDateBlocs(start: Date, end: Date): DateRange[] {
  const blocs: DateRange[] = []
  const current = new Date(start)

  while (current < end) {
    const since = new Date(current)
    const until = new Date(current)
    until.setDate(until.getDate() + 1)

    // Clamp until to end
    if (until > end) {
      until.setTime(end.getTime())
    }

    blocs.push({
      since: since.toISOString().split('T')[0],
      until: until.toISOString().split('T')[0],
    })

    current.setDate(current.getDate() + 2)
  }

  return blocs
}

function extractImage(creative: MetaAdCreative): string {
  const fallback = 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png'
  return (
    creative.creative?.image_url ??
    creative.creative?.object_story_spec?.video_data?.image_url ??
    creative.creative?.thumbnail_url ??
    creative.creative?.object_story_spec?.link_data?.picture ??
    creative.creative?.object_story_spec?.link_data?.image_url ??
    fallback
  )
}

function extractPermalink(creative: MetaAdCreative): string {
  if (creative.creative?.instagram_permalink_url) {
    return creative.creative.instagram_permalink_url
  }
  if (creative.creative?.effective_object_story_id) {
    return `https://www.facebook.com/${creative.creative.effective_object_story_id}`
  }
  return 'Dark Post'
}

function extractTargeting(targeting: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!targeting) return {}

  const result: Record<string, unknown> = {}

  // flexible_spec → interesses, família, comportamentos
  const flexibleSpec = targeting.flexible_spec as Array<{ name: string }> | undefined
  if (flexibleSpec) {
    const interesses: string[] = []
    const familia: string[] = []
    const comportamentos: string[] = []

    for (const item of flexibleSpec) {
      // Heurística simples: categoriza pelo nome
      const lower = (item.name ?? '').toLowerCase()
      if (['relationship', 'parents', 'family'].some((k) => lower.includes(k))) {
        familia.push(item.name)
      } else if (['behavior', 'comportamento'].some((k) => lower.includes(k))) {
        comportamentos.push(item.name)
      } else {
        interesses.push(item.name)
      }
    }

    if (interesses.length) result.target_interesses = interesses.join(', ')
    if (familia.length) result.target_familia = familia.join(', ')
    if (comportamentos.length) result.target_comportamentos = comportamentos.join(', ')
  }

  // custom_audiences
  const customAudiences = targeting.custom_audiences as Array<{ id: string; name?: string }> | undefined
  if (customAudiences?.length) {
    result.target_publicos_custom = customAudiences.map((a) => a.name ?? a.id).join(', ')
  }

  // platforms
  const publisherPlatforms = targeting.publisher_platforms as string[] | undefined
  if (publisherPlatforms?.length) {
    result.target_plataformas = publisherPlatforms.join(', ')
  }

  // positions
  const fbPositions = targeting.facebook_positions as string[] | undefined
  if (fbPositions?.length) {
    result.target_posicao_fb = fbPositions.join(', ')
  }

  const igPositions = targeting.instagram_positions as string[] | undefined
  if (igPositions?.length) {
    result.target_posicao_ig = igPositions.join(', ')
  }

  // age
  if (targeting.age_min != null) result.target_idade_min = targeting.age_min
  if (targeting.age_max != null) result.target_idade_max = targeting.age_max

  // geo
  const geo = targeting.geo_locations as Record<string, unknown> | undefined
  if (geo) {
    const customLocations = geo.custom_locations as Array<{ name: string; lat: number; long: number }> | undefined
    if (customLocations?.length) {
      const loc = customLocations[0]
      result.target_local_1 = loc.name
      result.target_local_2 = loc.lat
      result.target_local_3 = loc.long
    } else {
      const regions = geo.regions as Array<{ name: string }> | undefined
      const cities = geo.cities as Array<{ name: string }> | undefined
      const primary = regions?.[0] ?? cities?.[0]
      if (primary) {
        result.target_local_1 = primary.name
      }
    }

    const locationTypes = geo.location_types as string[] | undefined
    if (locationTypes?.length) {
      result.target_tipo_local = locationTypes.join(', ')
    }
  }

  // brand safety
  const brandSafety = targeting.brand_safety as { excluded_lists?: string[] } | undefined
  if (brandSafety?.excluded_lists?.length) {
    result.target_brand_safety = brandSafety.excluded_lists.join(', ')
  }

  return result
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── API Calls ───────────────────────────────────────────────────────────────

async function fetchMetaAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const url = `${META_GRAPH_BASE}/me/adaccounts`
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,amount_spent,spend_cap,balance,disable_reason,is_prepay_account,account_status,funding_source_details{display_string,id,type},prepaid_amount_info{amount{amount,currency,offset}}',
    limit: '300',
  })

  const res = await fetch(`${url}?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta API error (accounts): ${res.status} — ${body}`)
  }

  const json = await res.json()
  return (json.data ?? []) as MetaAdAccount[]
}

async function fetchInsights(
  accessToken: string,
  accountId: string,
  dateRange: DateRange,
): Promise<MetaInsightAd[]> {
  const url = `${META_GRAPH_BASE}/act_${accountId}/insights`
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'ad',
    time_range: JSON.stringify(dateRange),
    time_increment: '1',
    limit: '3000',
    fields: INSIGHT_FIELDS.join(','),
  })

  const res = await fetch(`${url}?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta API error (insights act_${accountId}): ${res.status} — ${body}`)
  }

  const json = await res.json()
  return (json.data ?? []) as MetaInsightAd[]
}

async function fetchAdCreative(accessToken: string, adId: string): Promise<MetaAdCreative | null> {
  const url = `${META_GRAPH_BASE}/${adId}`
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: AD_FIELDS.join(','),
  })

  const res = await fetch(`${url}?${params}`)
  if (!res.ok) {
    return null
  }

  return (await res.json()) as MetaAdCreative
}

// ─── Supabase Operations ─────────────────────────────────────────────────────

async function upsertAdAccounts(
  supabase: SupabaseClient,
  accounts: MetaAdAccount[],
): Promise<number> {
  if (!accounts.length) return 0

  const rows = accounts.map((acc) => {
    const saldoFinal = parseSaldo(acc)
    return {
      account_id: acc.id.replace('act_', ''),
      account_id_link: acc.id.replace('act_', ''),
      nome_original: acc.name,
      status_meta: statusMap(acc.account_status),
      eh_pre_pago: acc.is_prepay_account ? 'Sim' : 'Não',
      motivo_bloqueio: acc.disable_reason === 0 ? 'Nenhum' : `Código ${acc.disable_reason}`,
      moeda: 'BRL',
      saldo_balanco: saldoFinal,
      limite_gastos: acc.spend_cap > 0 ? acc.spend_cap / 100 : null,
      total_gasto: acc.amount_spent / 100,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase.from('tb_meta_ads_contas').upsert(rows, {
    onConflict: 'account_id',
  })

  if (error) {
    console.error('Upsert ad accounts error:', error)
    throw error
  }

  return rows.length
}

async function markRemovedAccounts(supabase: SupabaseClient): Promise<void> {
  // Mark accounts not updated in the last 20 minutes as 'removed'
  const { error } = await supabase.rpc('mark_stale_accounts_removed')

  if (error) {
    // Fallback: raw SQL via rest
    console.warn('RPC mark_stale_accounts_removed not found, skipping')
  }
}

async function getActiveAccounts(supabase: SupabaseClient): Promise<
  Array<{
    account_id: string
    nome_ajustado: string | null
    franqueado_id: string | null
    onboarding_status: string
    historico_dias: number
  }>
> {
  const { data, error } = await supabase
    .from('tb_meta_ads_contas')
    .select('account_id, nome_ajustado, franqueado_id, onboarding_status, historico_dias')
    .or('client_visibility.eq.true,status_interno.eq.ativo')

  if (error) {
    console.error('Error fetching active accounts:', error)
    return []
  }

  return (data ?? []).map((row) => ({
    account_id: row.account_id,
    nome_ajustado: row.nome_ajustado,
    franqueado_id: row.franqueado_id,
    onboarding_status: row.onboarding_status ?? 'active',
    historico_dias: row.historico_dias ?? 3,
  }))
}

async function upsertInsights(
  supabase: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<number> {
  if (!rows.length) return 0

  // Process in batches of 50 to avoid payload limits
  const BATCH_SIZE = 50
  let totalUpserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('ads_insights').upsert(batch, {
      onConflict: 'unique_id',
    })

    if (error) {
      console.error(`Upsert insights batch error (offset ${i}):`, error)
    } else {
      totalUpserted += batch.length
    }
  }

  return totalUpserted
}

async function activateOnboarding(supabase: SupabaseClient, accountId: string): Promise<void> {
  const { error } = await supabase
    .from('tb_meta_ads_contas')
    .update({ onboarding_status: 'active', first_sync_at: new Date().toISOString() })
    .eq('account_id', accountId)

  if (error) {
    console.error(`Error activating onboarding for ${accountId}:`, error)
  }
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

async function collectSaldo(accessToken: string, supabase: SupabaseClient): Promise<number> {
  console.log('[SALDOS] Fetching ad accounts from Meta...')
  const metaAccounts = await fetchMetaAccounts(accessToken)
  console.log(`[SALDOS] Found ${metaAccounts.length} accounts`)

  const upserted = await upsertAdAccounts(supabase, metaAccounts)
  console.log(`[SALDOS] Upserted ${upserted} accounts`)

  // Mark stale accounts
  await markRemovedAccounts(supabase)

  return upserted
}

async function collectInsights(
  accessToken: string,
  supabase: SupabaseClient,
): Promise<number> {
  console.log('[INSIGHTS] Fetching active accounts...')
  const accounts = await getActiveAccounts(supabase)
  console.log(`[INSIGHTS] Found ${accounts.length} accounts to collect`)

  let totalUpserted = 0
  const now = new Date()

  // Process accounts in batches of 5
  const BATCH_SIZE = 5
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE)
    console.log(`[INSIGHTS] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} accounts)`)

    const promises = batch.map(async (account) => {
      try {
        // Define date window
        const isOnboarding = account.onboarding_status === 'pending'
        const days = isOnboarding ? 90 : account.historico_dias || 3

        const endDate = new Date(now)
        const startDate = new Date(now)
        startDate.setDate(startDate.getDate() - days)

        // Generate 2-day blocs
        const blocs = generateDateBlocs(startDate, endDate)
        console.log(`[INSIGHTS] Account ${account.account_id}: ${blocs} date blocs`)

        let accountUpserted = 0

        for (const bloc of blocs) {
          try {
            const insights = await fetchInsights(accessToken, account.account_id, bloc)

            if (!insights.length) continue

            // Fetch creative/targeting for each ad
            const rows: Array<Record<string, unknown>> = []

            for (const insight of insights) {
              const adId = String(insight.ad_id)
              const dateStart = insight.date_start
              const actions = parseActions(insight.actions)
              const spend = parseFloat(String(insight.spend)) ?? 0
              const leadsTotal = actions.leads_total ?? 0
              const compras = actions.compras ?? 0

              const cpl = leadsTotal > 0 ? spend / leadsTotal : 0
              const cpa = compras > 0 ? spend / compras : 0

              // Fetch creative data
              let creative: MetaAdCreative | null = null
              try {
                creative = await fetchAdCreative(accessToken, adId)
                await sleep(150) // Rate limiting
              } catch {
                creative = null
              }

              const targeting = extractTargeting(creative?.adset?.targeting)

              const row: Record<string, unknown> = {
                unique_id: `${adId}_${dateStart}`,
                date_start: dateStart,
                account_id: insight.account_id,
                account_name: insight.account_name,
                franqueado: null, // Can be derived from account mapping
                ad_id: parseInt(adId, 10),
                campaign_name: insight.campaign_name,
                ad_name: insight.ad_name,
                ad_image_url: extractImage(creative ?? {}),
                valor_gasto: spend,
                impressoes: parseInt(String(insight.impressions), 10),
                cliques_todos: parseInt(String(insight.clicks), 10),
                leads_total: leadsTotal,
                msgs_iniciadas: actions.msgs_iniciadas ?? 0,
                alcance: parseInt(String(insight.reach), 10),
                compras: compras,
                freq: parseFloat(String(insight.frequency)) || null,
                cpm: parseFloat(String(insight.cpm)) || 0,
                cpc: parseFloat(String(insight.cpc)) || 0,
                ctr: parseFloat(String(insight.ctr)) || 0,
                cpl: cpl > 0 ? parseFloat(cpl.toFixed(2)) : null,
                cpa: cpa > 0 ? parseFloat(cpa.toFixed(2)) : null,
                adset_name: insight.adset_name,
                objective: translateObjective(insight.objective),
                frequencia: parseFloat(String(insight.frequency)) || null,
                custo_por_lead: cpl > 0 ? parseFloat(cpl.toFixed(2)) : 0,
                custo_por_compra: cpa > 0 ? parseFloat(cpa.toFixed(2)) : 0,
                msgs_conexoes: actions.msgs_conexoes ?? 0,
                msgs_novos_contatos: actions.msgs_novos_contatos ?? 0,
                msgs_profundidade_2: actions.msgs_profundidade_2 ?? 0,
                msgs_profundidade_3: actions.msgs_profundidade_3 ?? 0,
                target_interesses: targeting.target_interesses ?? null,
                target_familia: targeting.target_familia ?? null,
                target_comportamentos: targeting.target_comportamentos ?? null,
                target_publicos_custom: targeting.target_publicos_custom ?? null,
                target_local_1: targeting.target_local_1 ?? null,
                target_local_2: targeting.target_local_2 ?? null,
                target_local_3: targeting.target_local_3 ?? null,
                target_tipo_local: targeting.target_tipo_local ?? null,
                target_brand_safety: targeting.target_brand_safety ?? null,
                target_plataformas: targeting.target_plataformas ?? null,
                target_posicao_fb: targeting.target_posicao_fb ?? null,
                target_posicao_ig: targeting.target_posicao_ig ?? null,
                target_idade_min: targeting.target_idade_min ?? null,
                target_idade_max: targeting.target_idade_max ?? null,
                ad_title: creative?.creative?.title ?? null,
                ad_body: creative?.creative?.body ?? null,
                ad_destination_url: creative?.creative?.object_story_spec?.link_data?.link ?? null,
                ad_cta: creative?.creative?.call_to_action_type ?? null,
                ad_post_link: extractPermalink(creative ?? {}),
                plataforma: 'meta',
                platform_raw_id: adId,
                updated_at: new Date().toISOString(),
              }

              rows.push(row)
            }

            if (rows.length) {
              const upserted = await upsertInsights(supabase, rows)
              accountUpserted += upserted
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error(`[INSIGHTS] Error fetching bloc ${bloc.since}-${bloc.until} for ${account.account_id}: ${errMsg}`)
          }
        }

        // Activate onboarding if pending
        if (isOnboarding) {
          await activateOnboarding(supabase, account.account_id)
        }

        return accountUpserted
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(`[INSIGHTS] Error processing account ${account.account_id}: ${errMsg}`)
        return 0
      }
    })

    const results = await Promise.all(promises)
    totalUpserted += results.reduce((sum, val) => sum + val, 0)
    console.log(`[INSIGHTS] Batch done: ${results.reduce((s, v) => s + v, 0)} ads upserted`)
  }

  return totalUpserted
}

// ─── Edge Function Entry Point ───────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse request body for mode
  let bodyMode: string | null = null
  try {
    const body = await req.json() as Record<string, unknown>
    bodyMode = (body.mode as string) ?? null
  } catch {
    // No body or invalid JSON — ignore
  }

  const saldosOnly = bodyMode === 'saldos_only'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Busca tokens Meta da tabela platform_credentials
  const { data: credentials, error: credError } = await supabase
    .from('platform_credentials')
    .select('id, credentials')
    .eq('plataforma', 'meta')

  if (credError) {
    console.error('Error fetching platform_credentials:', credError)
  }

  let metaTokens: Array<{ token: string; label: string }> = []

  if (credentials && credentials.length > 0) {
    for (const cred of credentials) {
      const creds = cred.credentials as Record<string, unknown> | null
      const token = creds?.access_token as string | undefined
      const bmName = (creds?.bm_name as string) ?? `BM_${cred.id.slice(0, 8)}`

      if (token) {
        metaTokens.push({ token, label: bmName })
      }
    }
    console.log(`[collect-meta-ads] Found ${metaTokens.length} BM credential(s)`)
  }

  // Fallback: env variable
  if (metaTokens.length === 0) {
    const fallbackToken = Deno.env.get('META_ACCESS_TOKEN')
    if (!fallbackToken) {
      return new Response(
        JSON.stringify({ error: 'No Meta tokens found. Add credentials to platform_credentials table or set META_ACCESS_TOKEN env var.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    metaTokens.push({ token: fallbackToken, label: 'META_ACCESS_TOKEN (env)' })
    console.log('[collect-meta-ads] Using fallback META_ACCESS_TOKEN from env')
  }

  const errors: string[] = []
  let totalBmsProcessed = 0
  let totalAccountsProcessed = 0
  let totalAdsUpserted = 0

  for (const { token: accessToken, label: bmName } of metaTokens) {
    totalBmsProcessed++
    console.log(`\n[BM ${totalBmsProcessed}/${metaTokens.length}] Processing: ${bmName}`)

    // Phase 1: Saldos
    try {
      const accountsCount = await collectSaldo(accessToken, supabase)
      totalAccountsProcessed += accountsCount
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${bmName}] SALDOS: ${msg}`)
      console.error(`[${bmName}] SALDOS failed: ${msg}`)
    }

    // Phase 2: Insights (skip if saldos_only mode)
    if (saldosOnly) {
      console.log(`[BM ${totalBmsProcessed}/${metaTokens.length}] Insights skipped (saldos_only mode)`)
    } else {
      try {
        const adsCount = await collectInsights(accessToken, supabase)
        totalAdsUpserted += adsCount
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${bmName}] INSIGHTS: ${msg}`)
        console.error(`[${bmName}] INSIGHTS failed: ${msg}`)
      }
    }
  }

  const result: CollectResult = {
    bms_processed: totalBmsProcessed,
    accounts_processed: totalAccountsProcessed,
    ads_upserted: totalAdsUpserted,
    errors,
  }

  console.log('[collect-meta-ads] Done:', JSON.stringify(result))

  return new Response(JSON.stringify(result), {
    status: errors.length > 0 ? 207 : 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
