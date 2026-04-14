# collect-meta-ads — Supabase Edge Function

Substitui o workflow n8n "Insights Dashboard Bihmks Meta".

Coleta automaticamente:
1. **Saldos** de todas as contas Meta Ads (BM) vinculadas
2. **Insights** detalhados por anúncio (com dados criativos e targeting)

---

## 1. Configurar Tokens Meta

### Opção A: Via tabela `platform_credentials` (recomendado — múltiplos BMs)

A função busca automaticamente todos os tokens cadastrados na tabela `platform_credentials`.

```sql
-- Inserir credencial de um BM
INSERT INTO platform_credentials (plataforma, credentials)
VALUES ('meta', '{
  "access_token": "EAA...",
  "bm_name": "BM Oral Sin",
  "bm_id": "123456789"
}'::jsonb);

-- Inserir segundo BM
INSERT INTO platform_credentials (plataforma, credentials)
VALUES ('meta', '{
  "access_token": "EAA...",
  "bm_name": "BM ODC Group",
  "bm_id": "987654321"
}'::jsonb);
```

**Campos esperados no JSON `credentials`:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `access_token` | string | ✅ | Token de acesso da Meta API |
| `bm_name` | string | ❌ | Nome do BM (exibido nos logs) |
| `bm_id` | string | ❌ | ID do Business Manager |

### Opção B: Via variável de ambiente (fallback — BM único)

Se não houver registros em `platform_credentials`, a função usa `META_ACCESS_TOKEN` como fallback.

#### Pelo Dashboard do Supabase
1. Acesse: `https://supabase.com/dashboard/project/haujeexmwnowhviwcrqy`
2. Navegue até **Edge Functions** → **collect-meta-ads** → **Secrets**
3. Clique em **Add Secret**
4. Nome: `META_ACCESS_TOKEN`
5. Valor: seu token de acesso Meta
6. Salve

#### Via CLI
```bash
supabase secrets set META_ACCESS_TOKEN="seu-token-aqui" \
  --project-ref haujeexmwnowhviwcrqy
```

### Outros Secrets (automáticos)
A função já usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, que são **injetados automaticamente** pelo Supabase em Edge Functions.

---

## 2. Deploy da Função

```bash
# Deploy único
supabase functions deploy collect-meta-ads --project-ref haujeexmwnowhviwcrqy

# Ou para atualizar após alterações
supabase functions deploy collect-meta-ads --project-ref haujeexmwnowhviwcrqy --no-verify-jwt
```

### Verificar se está rodando
```bash
curl -X POST \
  "https://haujeexmwnowhviwcrqy.supabase.co/functions/v1/collect-meta-ads" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdWplZXhtd25vd2h2aXdjcnF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcxOTE3MywiZXhwIjoyMDg1Mjk1MTczfQ.ID59NK65nivUBKWsbezzFur9kHk3qQNkSDe_n_Mf0hk" \
  -H "Content-Type: application/json"
```

---

## 3. Configurar pg_cron (Execução Automática)

A Edge Function **não roda sozinha** via cron — ela precisa ser chamada. A maneira mais simples é criar uma função SQL que faz o HTTP request.

### Opção A: Cron via pg_cron (recomendado)

```sql
-- Habilitar pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar função que chama a Edge Function
CREATE OR REPLACE FUNCTION public.trigger_meta_ads_collection()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text;
BEGIN
  SELECT content::text INTO result
  FROM http.post(
    'https://haujeexmwnowhviwcrqy.supabase.co/functions/v1/collect-meta-ads',
    '{}',
    ARRAY[http.header('Content-Type', 'application/json')],
    'application/json'
  );
  
  RAISE NOTICE 'Meta ads collection result: %', result;
END;
$$;

-- Agendar: diariamente às 01:00 BRT (04:00 UTC)
SELECT cron.schedule(
  'collect-meta-ads-daily',
  '0 4 * * *',  -- cron expression (UTC)
  $$SELECT public.trigger_meta_ads_collection()$$
);
```

### Opção B: Cron externo (GitHub Actions, Cloudflare Workers, etc.)

Se preferir não usar pg_cron, pode agendar um curl externo:

```bash
# Exemplo: cron do Linux às 01:00 BRT
0 4 * * * curl -X POST "https://haujeexmwnowhviwcrqy.supabase.co/functions/v1/collect-meta-ads" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" >> /var/log/meta-ads-cron.log 2>&1
```

### Verificar jobs agendados
```sql
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## 4. Testar Manualmente

### Via curl
```bash
curl -X POST \
  "https://haujeexmwnowhviwcrqy.supabase.co/functions/v1/collect-meta-ads" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdWplZXhtd25vd2h2aXdjcnF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcxOTE3MywiZXhwIjoyMDg1Mjk1MTczfQ.ID59NK65nivUBKWsbezzFur9kHk3qQNkSDe_n_Mf0hk" \
  -H "Content-Type: application/json"
```

### Resposta esperada
```json
{
  "bms_processed": 3,
  "accounts_processed": 365,
  "ads_upserted": 12000,
  "errors": []
}
```

### Com erros parciais (status 207)
```json
{
  "bms_processed": 3,
  "accounts_processed": 200,
  "ads_upserted": 8500,
  "errors": [
    "[BM Oral Sin] INSIGHTS: Meta API error (insights act_123): 400 — ..."
  ]
}
```

---

## 5. Monitoramento

### Logs da função
```bash
supabase functions logs collect-meta-ads --project-ref haujeexmwnowhviwcrqy
```

### Verificar no banco
```sql
-- Últimas atualizações de contas
SELECT account_id, nome_original, status_meta, saldo_balanco, updated_at
FROM tb_meta_ads_contas
ORDER BY updated_at DESC
LIMIT 20;

-- Últimos insights inseridos
SELECT unique_id, account_id, ad_name, valor_gasto, leads_total, data_start
FROM ads_insights
WHERE plataforma = 'meta'
ORDER BY updated_at DESC
LIMIT 20;

-- Contas com onboarding pendente
SELECT account_id, nome_original, onboarding_status, historico_dias
FROM tb_meta_ads_contas
WHERE onboarding_status = 'pending';
```

---

## 6. Diferenças para o Workflow n8n Anterior

| Aspecto | n8n (antigo) | Edge Function (novo) |
|---------|-------------|---------------------|
| Pipelines | 3 duplicados (por BM) | 1 unificado, config-driven |
| Rate limiting | ❌ | ✅ (150ms entre ads) |
| Batch processing | ❌ | ✅ (batches de 5 contas) |
| Onboarding auto-ativa | ❌ | ✅ (pending → active após 1° sync) |
| Stale account cleanup | ❌ | ✅ (marca 'removed' após 20 min) |
| Error handling | Para tudo | Log + continua |
| Custo | n8n server + execução | Serverless (paga por execução) |

---

## 7. Troubleshooting

### `META_ACCESS_TOKEN not configured`
- Verifique se o secret foi adicionado: `supabase secrets list`
- Ou no Dashboard: Edge Functions → Secrets

### Meta API retornando erro 400
- Token expirado ou inválido — gere um novo no Meta Developers
- Verifique as permissões do token: `ads_read`, `business_management`

### Upsert falhando no banco
- Verifique se as constraints `ON CONFLICT` existem:
  ```sql
  -- tb_meta_ads_contas
  SELECT conname FROM pg_constraint WHERE conrelid = 'tb_meta_ads_contas'::regclass;
  
  -- ads_insights
  SELECT conname FROM pg_constraint WHERE conrelid = 'ads_insights'::regclass;
  ```

### Função demorando muito
- Edge Functions têm timeout de 60s (plano free) ou 300s (plano pro)
- Se tiver muitas contas, considere dividir em duas funções (saldos + insights separados)
