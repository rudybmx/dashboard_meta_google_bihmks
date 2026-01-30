-- 2026-01-30 Fixes for Demographics Data and Managerial Report

-- 1. Recreate vw_dashboard_unified with missing Age and Targeting columns
DROP VIEW IF EXISTS vw_dashboard_unified CASCADE;

CREATE OR REPLACE VIEW vw_dashboard_unified AS
SELECT ai.unique_id,
    ai.date_start,
    ai.account_id,
    ai.account_name,
    ai.franqueado,
    ai.ad_id,
    ai.campaign_name,
    ai.adset_name,
    ai.ad_name,
    ai.objective,
    ai.ad_image_url,
    ai.ad_destination_url,
    ai.ad_cta,
    ai.ad_post_link,
    ai.ad_body,
    ai.valor_gasto,
    ai.impressoes,
    ai.cliques_todos,
    ai.leads_total,
    ai.msgs_iniciadas,
    ai.alcance,
    ai.compras,
    ai.freq AS frequencia,
    ai.cpm,
    ai.cpc,
    ai.ctr,
    ai.cpl AS custo_por_lead,
    ai.cpa AS custo_por_compra,
    ai.msgs_conexoes,
    ai.msgs_novos_contatos,
    ai.msgs_profundidade_2,
    ai.msgs_profundidade_3,
    ai.target_interesses,
    ai.target_familia,
    ai.target_comportamentos,
    ai.target_publicos_custom,
    ai.target_local_1,
    ai.target_plataformas,
    -- NEW COLUMNS ADDED
    ai.target_idade_min,
    ai.target_idade_max,
    ai.target_local_2,
    ai.target_local_3,
    ai.target_tipo_local,
    ai.target_brand_safety,
    ai.target_posicao_fb,
    ai.target_posicao_ig,
    
    mac.franqueado_id,
    mac.nome_ajustado,
    mac.status_interno,
    mac.categoria_id,
    mac.saldo_balanco AS current_balance,
    f.nome AS nome_franqueado
   FROM ads_insights ai
     LEFT JOIN tb_meta_ads_contas mac ON ai.account_id = mac.account_id_link
     LEFT JOIN tb_franqueados f ON mac.franqueado_id = f.id
  WHERE mac.client_visibility = true;

-- 2. Restore get_campaign_summary (dropped by CASCADE)
CREATE OR REPLACE FUNCTION public.get_campaign_summary(p_start_date date, p_end_date date, p_franchise_ids uuid[] DEFAULT NULL::uuid[], p_account_ids text[] DEFAULT NULL::text[])
 RETURNS SETOF vw_dashboard_unified
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.vw_dashboard_unified v
    WHERE v.date_start BETWEEN p_start_date AND p_end_date
    AND (
        (p_franchise_ids IS NULL OR v.franqueado_id = ANY(p_franchise_ids))
        OR
        (p_account_ids IS NULL OR v.account_id::text = ANY(p_account_ids))
    );
END;
$function$;

-- 3. Restore and Fix get_kpi_comparison (dropped by CASCADE)
CREATE OR REPLACE FUNCTION public.get_kpi_comparison(p_start_date date, p_end_date date, p_prev_start_date date, p_prev_end_date date, p_franchise_filter uuid[] DEFAULT NULL::uuid[], p_account_filter text[] DEFAULT NULL::text[])
 RETURNS TABLE(current_spend numeric, prev_spend numeric, current_leads bigint, prev_leads bigint, current_sales bigint, prev_sales bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_start_date AND p_end_date THEN valor_gasto ELSE 0 END), 0) as current_spend,
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_prev_start_date AND p_prev_end_date THEN valor_gasto ELSE 0 END), 0) as prev_spend,
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_start_date AND p_end_date THEN leads_total ELSE 0 END), 0)::BIGINT as current_leads,
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_prev_start_date AND p_prev_end_date THEN leads_total ELSE 0 END), 0)::BIGINT as prev_leads,
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_start_date AND p_end_date THEN compras ELSE 0 END), 0)::BIGINT as current_sales,
        COALESCE(SUM(CASE WHEN date_start BETWEEN p_prev_start_date AND p_prev_end_date THEN compras ELSE 0 END), 0)::BIGINT as prev_sales
    FROM public.vw_dashboard_unified v
    WHERE 
        (v.date_start BETWEEN p_start_date AND p_end_date OR v.date_start BETWEEN p_prev_start_date AND p_prev_end_date)
        AND (
            (p_franchise_filter IS NULL OR v.franqueado_id = ANY(p_franchise_filter))
            OR
            (p_account_filter IS NULL OR v.account_id::text = ANY(p_account_filter))
        );
END;
$function$;

-- 4. Restore and Fix get_managerial_data (Fixes RPC Error 42004 and Logic)
CREATE OR REPLACE FUNCTION public.get_managerial_data(p_start_date date, p_end_date date, p_franchise_filter uuid[] DEFAULT NULL::uuid[], p_account_filter text[] DEFAULT NULL::text[])
 RETURNS TABLE(meta_account_id text, nome_conta text, franqueado text, saldo_atual numeric, investimento numeric, leads bigint, compras bigint, conversas bigint, clicks bigint, impressoes bigint, alcance bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        mac.account_id::text as meta_account_id,
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome') as nome_conta,
        COALESCE(f.nome, 'N/A') as franqueado,
        COALESCE(mac.saldo_balanco::numeric, 0) as saldo_atual,
        COALESCE(SUM(ai.valor_gasto), 0) as investimento,
        COALESCE(SUM(ai.leads_total), 0)::BIGINT as leads,
        COALESCE(SUM(ai.compras), 0)::BIGINT as compras,
        COALESCE(SUM(ai.msgs_iniciadas), 0)::BIGINT as conversas,
        COALESCE(SUM(ai.cliques_todos), 0)::BIGINT as clicks,
        COALESCE(SUM(ai.impressoes), 0)::BIGINT as impressoes,
        COALESCE(MAX(ai.alcance), 0)::BIGINT as alcance
    FROM public.tb_meta_ads_contas mac
    LEFT JOIN public.tb_franqueados f ON mac.franqueado_id = f.id
    -- FIX: Join using account_id_link (BIGINT) instead of account_id (TEXT)
    LEFT JOIN public.ads_insights ai ON mac.account_id_link = ai.account_id AND ai.date_start BETWEEN p_start_date AND p_end_date
    WHERE 
        mac.client_visibility = true
        AND (
            (p_franchise_filter IS NULL OR mac.franqueado_id = ANY(p_franchise_filter))
            OR
            (p_account_filter IS NULL OR mac.account_id::text = ANY(p_account_filter))
        )
    GROUP BY 
        mac.account_id, 
        COALESCE(mac.nome_ajustado, mac.nome_original, 'Sem Nome'), 
        COALESCE(f.nome, 'N/A'),
        COALESCE(mac.saldo_balanco::numeric, 0);
END;
$function$;
