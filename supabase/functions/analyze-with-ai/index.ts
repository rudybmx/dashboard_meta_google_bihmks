/**
 * analyze-with-ai — Supabase Edge Function
 *
 * Analisa performance de Meta Ads e gera insights via OpenRouter API.
 * Compara período atual vs anterior vs benchmark do cluster.
 *
 * Trigger: HTTP POST
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountMetrics {
  account_id: string
  account_name: string
  gasto_total: number
  leads_total: number
  msgs_total: number
  impressoes_total: number
  cpl_medio: number
  ctr_medio: number
  frequencia_media: number
}

interface AdRank {
  ad_name: string
  campaign_name: string
  cpl: number
  ctr: number
}

interface Insight {
  type: 'anomaly' | 'recommendation' | 'benchmark'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  summary: string
  metric: 'cpl' | 'ctr' | 'leads' | 'frequencia' | 'gasto'
  valor_atual: number
  valor_referencia: number
  variacao_percentual: number
  acao_sugerida: string
}

interface AIResponse {
  insights: Insight[]
}

interface AnalysisResult {
  model_used: string
  accounts_analyzed: number
  insights_generated: number
  skipped: number
  errors: string[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é especialista em performance de Meta Ads.
Analise os dados e retorne APENAS JSON válido sem markdown.
Seja direto e acionável. Foco em leads e CPL.`

const ACCOUNT_QUERY_CURRENT = `
SELECT
  account_id,
  account_name,
  COALESCE(SUM(valor_gasto), 0) as gasto_total,
  COALESCE(SUM(leads_total), 0) as leads_total,
  COALESCE(SUM(msgs_iniciadas), 0) as msgs_total,
  COALESCE(SUM(impressoes), 0) as impressoes_total,
  CASE WHEN SUM(leads_total) > 0
    THEN ROUND((SUM(valor_gasto) / SUM(leads_total))::numeric, 2)
    ELSE 0 END as cpl_medio,
  ROUND(AVG(ctr)::numeric, 2) as ctr_medio,
  ROUND(AVG(frequencia)::numeric, 2) as frequencia_media
FROM ads_insights
WHERE account_id = $1
  AND plataforma = 'meta'
  AND date_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY account_id, account_name
`

const ACCOUNT_QUERY_PREVIOUS = `
SELECT
  account_id,
  account_name,
  COALESCE(SUM(valor_gasto), 0) as gasto_total,
  COALESCE(SUM(leads_total), 0) as leads_total,
  COALESCE(SUM(msgs_iniciadas), 0) as msgs_total,
  COALESCE(SUM(impressoes), 0) as impressoes_total,
  CASE WHEN SUM(leads_total) > 0
    THEN ROUND((SUM(valor_gasto) / SUM(leads_total))::numeric, 2)
    ELSE 0 END as cpl_medio,
  ROUND(AVG(ctr)::numeric, 2) as ctr_medio,
  ROUND(AVG(frequencia)::numeric, 2) as frequencia_media
FROM ads_insights
WHERE account_id = $1
  AND plataforma = 'meta'
  AND date_start >= CURRENT_DATE - INTERVAL '14 days'
  AND date_start < CURRENT_DATE - INTERVAL '7 days'
GROUP BY account_id, account_name
`

const CLUSTER_QUERY = `
SELECT
  ROUND(AVG(CASE WHEN leads_total > 0
    THEN valor_gasto / NULLIF(leads_total, 0) ELSE NULL END)::numeric, 2) as cpl_cluster,
  ROUND(AVG(ctr)::numeric, 2) as ctr_cluster
FROM ads_insights
WHERE plataforma = 'meta'
  AND date_start >= CURRENT_DATE - INTERVAL '7 days'
`

const TOP_ADS_QUERY = `
SELECT ad_name, campaign_name,
  ROUND(cpl::numeric, 2) as cpl,
  ROUND(ctr::numeric, 2) as ctr
FROM ads_insights
WHERE account_id = $1
  AND plataforma = 'meta'
  AND date_start >= CURRENT_DATE - INTERVAL '7 days'
  AND leads_total > 0
ORDER BY cpl ASC
LIMIT 3
`

const BOTTOM_ADS_QUERY = `
SELECT ad_name, campaign_name,
  ROUND(cpl::numeric, 2) as cpl,
  ROUND(ctr::numeric, 2) as ctr
FROM ads_insights
WHERE account_id = $1
  AND plataforma = 'meta'
  AND date_start >= CURRENT_DATE - INTERVAL '7 days'
  AND leads_total > 0
ORDER BY cpl DESC
LIMIT 3
`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNum(val: unknown): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function variationPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildUserPrompt(
  accountName: string,
  accountId: string,
  current: AccountMetrics | null,
  previous: AccountMetrics | null,
  clusterCpl: number,
  clusterCtr: number,
  topAds: AdRank[],
  bottomAds: AdRank[],
): string {
  const gastoAtual = current?.gasto_total ?? 0
  const leadsAtual = current?.leads_total ?? 0
  const cplAtual = current?.cpl_medio ?? 0
  const ctrAtual = current?.ctr_medio ?? 0
  const freqAtual = current?.frequencia_media ?? 0

  const gastoAnterior = previous?.gasto_total ?? 0
  const leadsAnterior = previous?.leads_total ?? 0
  const cplAnterior = previous?.cpl_medio ?? 0
  const ctrAnterior = previous?.ctr_medio ?? 0

  const varCpl = variationPct(cplAtual, cplAnterior)
  const varLeads = variationPct(leadsAtual, leadsAnterior)

  const cplPosition = cplAtual <= clusterCpl ? 'ABAIXO (melhor)' : 'ACIMA (pior)'

  const topStr = topAds.length
    ? topAds.map((a) => `${a.ad_name} CPL:R$${a.cpl}`).join(' | ')
    : 'Nenhum criativo com leads'
  const bottomStr = bottomAds.length
    ? bottomAds.map((a) => `${a.ad_name} CPL:R$${a.cpl}`).join(' | ')
    : 'Nenhum criativo com leads'

  return `
Conta: ${accountName} (${accountId})

ATUAL (7 dias): Gasto R$${gastoAtual.toFixed(2)} | Leads ${leadsAtual} | CPL R$${cplAtual.toFixed(2)} | CTR ${ctrAtual}% | Freq ${freqAtual}
ANTERIOR (7-14d): Gasto R$${gastoAnterior.toFixed(2)} | Leads ${leadsAnterior} | CPL R$${cplAnterior.toFixed(2)} | CTR ${ctrAnterior}%
VARIAÇÃO: CPL ${varCpl > 0 ? '+' : ''}${varCpl}% | Leads ${varLeads > 0 ? '+' : ''}${varLeads}%
CLUSTER: CPL médio R$${clusterCpl ?? 0} | CTR médio ${clusterCtr ?? 0}%
POSIÇÃO: Esta conta está ${cplPosition} da média

TOP CRIATIVOS: ${topStr}
PIORES: ${bottomStr}

Retorne JSON:
{
  "insights": [
    {
      "type": "anomaly|recommendation|benchmark",
      "severity": "low|medium|high|critical",
      "title": "max 60 chars",
      "summary": "max 150 chars",
      "metric": "cpl|ctr|leads|frequencia|gasto",
      "valor_atual": 0,
      "valor_referencia": 0,
      "variacao_percentual": 0,
      "acao_sugerida": "max 100 chars"
    }
  ]
}
Gere 2 a 4 insights priorizando os mais críticos e acionáveis.`
}

// ─── Database Operations ─────────────────────────────────────────────────────

async function getConfigs(supabase: SupabaseClient): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['ai_insights_model', 'ai_insights_enabled', 'ai_insights_min_gasto', 'ai_insights_max_contas'])

  if (error) {
    throw new Error(`Failed to fetch system_config: ${error.message}`)
  }

  const result: Record<string, unknown> = {}
  for (const row of data ?? []) {
    // value pode ser string, number, boolean — extrair o valor raw
    result[row.key] = row.value
  }
  return result
}

async function getActiveAccounts(supabase: SupabaseClient, maxCount: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('tb_meta_ads_contas')
    .select('account_id')
    .eq('client_visibility', true)
    .limit(maxCount)

  if (error) {
    throw new Error(`Failed to fetch active accounts: ${error.message}`)
  }

  return (data ?? []).map((row: Record<string, unknown>) => String(row.account_id))
}

async function fetchMetrics(
  supabase: SupabaseClient,
  accountId: string,
  query: string,
): Promise<AccountMetrics | null> {
  const { data, error } = await supabase.rpc('rpc_exec_sql', {
    sql_query: query,
    params: [accountId],
  })

  if (error) {
    // Fallback: via REST com filtro manual
    const { data: restData } = await supabase
      .from('ads_insights')
      .select('account_id, account_name, valor_gasto, leads_total, msgs_iniciadas, impressoes, ctr, frequencia')
      .eq('account_id', accountId)
      .eq('plataforma', 'meta')
      .gte('date_start', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])

    if (!restData?.length) return null

    const totalGasto = restData.reduce((s, r) => s + (r.valor_gasto ?? 0), 0)
    const totalLeads = restData.reduce((s, r) => s + (r.leads_total ?? 0), 0)
    const avgCtr = restData.reduce((s, r) => s + (r.ctr ?? 0), 0) / restData.length
    const avgFreq = restData.reduce((s, r) => s + (r.frequencia ?? 0), 0) / restData.length

    return {
      account_id: accountId,
      account_name: restData[0].account_name ?? '',
      gasto_total: totalGasto,
      leads_total: totalLeads,
      msgs_total: restData.reduce((s, r) => s + (r.msgs_iniciadas ?? 0), 0),
      impressoes_total: restData.reduce((s, r) => s + (r.impressoes ?? 0), 0),
      cpl_medio: totalLeads > 0 ? Math.round((totalGasto / totalLeads) * 100) / 100 : 0,
      ctr_medio: Math.round(avgCtr * 100) / 100,
      frequencia_media: Math.round(avgFreq * 100) / 100,
    }
  }

  if (!data?.length) return null
  const row = data[0]
  return {
    account_id: row.account_id,
    account_name: row.account_name,
    gasto_total: safeNum(row.gasto_total),
    leads_total: safeNum(row.leads_total),
    msgs_total: safeNum(row.msgs_total),
    impressoes_total: safeNum(row.impressoes_total),
    cpl_medio: safeNum(row.cpl_medio),
    ctr_medio: safeNum(row.ctr_medio),
    frequencia_media: safeNum(row.frequencia_media),
  }
}

async function fetchAccountMetrics(
  supabase: SupabaseClient,
  accountId: string,
  daysAgo: number,
  daysUntil: number,
): Promise<AccountMetrics | null> {
  // daysAgo = how many days back to start (e.g. 7 for "7 days ago")
  // daysUntil = how many days back to end (e.g. 0 for "today")
  const startOffset = Math.max(daysAgo, daysUntil)
  const endOffset = Math.min(daysAgo, daysUntil)

  const startDate = new Date(Date.now() - startOffset * 86400000).toISOString().split('T')[0]
  const endDate = new Date(Date.now() - endOffset * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('ads_insights')
    .select('account_id, account_name, valor_gasto, leads_total, msgs_iniciadas, impressoes, ctr, frequencia')
    .eq('account_id', accountId)
    .eq('plataforma', 'meta')
    .gte('date_start', startDate)
    .lt('date_start', endDate)

  if (error || !data?.length) return null

  const totalGasto = data.reduce((s, r) => s + (r.valor_gasto ?? 0), 0)
  const totalLeads = data.reduce((s, r) => s + (r.leads_total ?? 0), 0)
  const avgCtr = data.reduce((s, r) => s + (r.ctr ?? 0), 0) / data.length
  const avgFreq = data.reduce((s, r) => s + (r.frequencia ?? 0), 0) / data.length

  return {
    account_id: accountId,
    account_name: data[0].account_name ?? '',
    gasto_total: Math.round(totalGasto * 100) / 100,
    leads_total: totalLeads,
    msgs_total: data.reduce((s, r) => s + (r.msgs_iniciadas ?? 0), 0),
    impressoes_total: data.reduce((s, r) => s + (r.impressoes ?? 0), 0),
    cpl_medio: totalLeads > 0 ? Math.round((totalGasto / totalLeads) * 100) / 100 : 0,
    ctr_medio: Math.round(avgCtr * 100) / 100,
    frequencia_media: Math.round(avgFreq * 100) / 100,
  }
}

async function fetchClusterBenchmark(supabase: SupabaseClient): Promise<{ cpl: number; ctr: number }> {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('ads_insights')
    .select('valor_gasto, leads_total, ctr')
    .eq('plataforma', 'meta')
    .gte('date_start', startDate)

  if (error || !data?.length) {
    return { cpl: 0, ctr: 0 }
  }

  const accountsWithLeads = data.filter((r) => (r.leads_total ?? 0) > 0 && (r.valor_gasto ?? 0) > 0)
  const cplCluster = accountsWithLeads.length
    ? Math.round((accountsWithLeads.reduce((s, r) => s + (r.valor_gasto ?? 0) / (r.leads_total ?? 1), 0) / accountsWithLeads.length) * 100) / 100
    : 0

  const ctrCluster = data.length
    ? Math.round((data.reduce((s, r) => s + (r.ctr ?? 0), 0) / data.length) * 100) / 100
    : 0

  return { cpl: cplCluster, ctr: ctrCluster }
}

async function fetchAdRank(
  supabase: SupabaseClient,
  accountId: string,
  order: 'ASC' | 'DESC',
): Promise<AdRank[]> {
  const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('ads_insights')
    .select('ad_name, campaign_name, cpl, ctr, leads_total')
    .eq('account_id', accountId)
    .eq('plataforma', 'meta')
    .gte('date_start', startDate)
    .gt('leads_total', 0)
    .order(order === 'ASC' ? 'cpl' : 'cpl', { ascending: order === 'ASC' })
    .limit(3)

  if (error || !data?.length) return []

  return data.map((r) => ({
    ad_name: r.ad_name ?? '',
    campaign_name: r.campaign_name ?? '',
    cpl: safeNum(r.cpl),
    ctr: safeNum(r.ctr),
  }))
}

async function saveInsights(
  supabase: SupabaseClient,
  accountId: string,
  insights: Insight[],
): Promise<number> {
  const periodoInicio = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  // Check if insights already exist for this account today
  const { data: existing } = await supabase
    .from('ai_insights')
    .select('id')
    .eq('account_id', accountId)
    .eq('insight_type', insights[0]?.type ?? '')
    .gte('generated_at', periodoInicio)
    .limit(1)

  if (existing?.length) {
    return 0 // Already has insights for today
  }

  const periodoFim = new Date().toISOString().split('T')[0]

  const rows = insights.map((insight) => ({
    account_id: accountId,
    periodo_inicio: periodoInicio,
    periodo_fim: periodoFim,
    plataforma: 'meta',
    insight_type: insight.type,
    severity: insight.severity,
    title: insight.title,
    content: JSON.stringify(insight),
    generated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('ai_insights').insert(rows)

  if (error) {
    console.error(`Error saving insights for account ${accountId}: ${error.message}`)
    return 0
  }

  return rows.length
}

// ─── OpenRouter Call ─────────────────────────────────────────────────────────

async function callOpenRouter(
  model: string,
  userPrompt: string,
): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://dashboard.bihmks.com',
      'X-Title': 'BihPlat Insights',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter API error: ${res.status} — ${body}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('Empty response from OpenRouter')
  }

  // Strip markdown code blocks if present
  const jsonText = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

  try {
    return JSON.parse(jsonText) as AIResponse
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${jsonText.slice(0, 200)}`)
  }
}

// ─── Main Analysis Logic ─────────────────────────────────────────────────────

async function analyzeAccount(
  supabase: SupabaseClient,
  accountId: string,
  clusterCpl: number,
  clusterCtr: number,
  model: string,
): Promise<{ insights_count: number; skipped: boolean }> {
  // Current period (0-7 days)
  const current = await fetchAccountMetrics(supabase, accountId, 0, 7)

  if (!current || current.gasto_total === 0) {
    return { insights_count: 0, skipped: true }
  }

  // Previous period (7-14 days)
  const previous = await fetchAccountMetrics(supabase, accountId, 7, 14)

  // Ad rankings
  const topAds = await fetchAdRank(supabase, accountId, 'ASC')
  const bottomAds = await fetchAdRank(supabase, accountId, 'DESC')

  // Build prompt
  const prompt = buildUserPrompt(
    current.account_name,
    accountId,
    current,
    previous,
    clusterCpl,
    clusterCtr,
    topAds,
    bottomAds,
  )

  // Call AI
  const aiResponse = await callOpenRouter(model, prompt)

  if (!aiResponse.insights?.length) {
    return { insights_count: 0, skipped: true }
  }

  // Save to database
  const saved = await saveInsights(supabase, accountId, aiResponse.insights)

  return { insights_count: saved, skipped: false }
}

// ─── Edge Function Entry Point ───────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read config
  let config: Record<string, unknown>
  try {
    config = await getConfigs(supabase)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: `Failed to read config: ${msg}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Check if enabled
  const enabled = config.ai_insights_enabled === true || config.ai_insights_enabled === 'true'
  if (!enabled) {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'AI insights disabled in system_config' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const model = (config.ai_insights_model as string) ?? 'google/gemini-flash-1.5'
  const minGasto = Number(config.ai_insights_min_gasto) ?? 50
  const maxContas = Number(config.ai_insights_max_contas) ?? 15

  // Parse request body
  let targetAccountId: string | null = null
  try {
    const body = await req.json() as Record<string, unknown>
    targetAccountId = (body.account_id as string) ?? null
  } catch {
    // No body
  }

  // Get accounts to analyze
  let accountIds: string[]
  if (targetAccountId) {
    accountIds = [targetAccountId]
  } else {
    accountIds = await getActiveAccounts(supabase, maxContas)
  }

  if (!accountIds.length) {
    return new Response(
      JSON.stringify({ model_used: model, accounts_analyzed: 0, insights_generated: 0, skipped: 0, errors: ['No active accounts found'] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Fetch cluster benchmark once
  const { cpl: clusterCpl, ctr: clusterCtr } = await fetchClusterBenchmark(supabase)
  console.log(`[analyze-with-ai] Cluster benchmark: CPL R$${clusterCpl}, CTR ${clusterCtr}%`)

  const errors: string[] = []
  let accountsAnalyzed = 0
  let insightsGenerated = 0
  let skippedCount = 0

  for (let i = 0; i < accountIds.length; i++) {
    const accountId = accountIds[i]
    console.log(`[analyze-with-ai] Processing account ${i + 1}/${accountIds.length}: ${accountId}`)

    try {
      // Quick check: if current period total is below min_gasto, skip
      const current = await fetchAccountMetrics(supabase, accountId, 0, 7)
      if (!current || current.gasto_total < minGasto) {
        console.log(`[analyze-with-ai] Skipping ${accountId}: gasto R$${current?.gasto_total ?? 0} < R$${minGasto}`)
        skippedCount++
        continue
      }

      const result = await analyzeAccount(supabase, accountId, clusterCpl, clusterCtr, model)

      if (result.skipped) {
        skippedCount++
      } else {
        accountsAnalyzed++
        insightsGenerated += result.insights_count
        console.log(`[analyze-with-ai] Account ${accountId}: ${result.insights_count} insights saved`)
      }

      // Delay between accounts to avoid rate limits
      if (i < accountIds.length - 1) {
        await sleep(500)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`[${accountId}] ${msg}`)
      console.error(`[analyze-with-ai] Error analyzing ${accountId}: ${msg}`)
    }
  }

  const result: AnalysisResult = {
    model_used: model,
    accounts_analyzed: accountsAnalyzed,
    insights_generated: insightsGenerated,
    skipped: skippedCount,
    errors,
  }

  console.log('[analyze-with-ai] Done:', JSON.stringify(result))

  return new Response(JSON.stringify(result), {
    status: errors.length > 0 ? 207 : 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
