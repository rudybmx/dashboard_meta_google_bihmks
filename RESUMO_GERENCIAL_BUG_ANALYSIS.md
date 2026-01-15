# Bug Analysis: Resumo Gerencial Não Aparece para Multi-Franqueado

## 📊 Situação

- **Usuário**: rodrigo (multi-franqueado)
- **Acesso**: OP7 | GOIÂNIA e OP7 | BRASÍLIA
- **Problema**: Tela "Resumo Gerencial" não carrega nada (mostra "Total (0)" e RS 0,00)
- **Causa Suspeita**: Filtro por `assigned_franchise_ids` não está funcionando corretamente

---

## 🔍 Raíz do Problema (HIPÓTESE)

A tela usa **2 tabelas do Banco de Dados**:

1. **Tabela `insights`** (RPC que agregação dados)
   - Faz SUM, AVG dos dados
   - Filtra por: `data`, `franqueado`, `cliente`
   - **PROBLEMA**: A RPC pode estar rejeitando usuários multi-franqueado

2. **Tabela `meta_ads_count`** (Saldo)
   - Traz saldo único por conta
   - É como VLOOKUP/PROCV
   - **PROBLEMA**: O filtro multi-franqueado não está sendo passado

---

## 🎯 Fluxo de Execução

```
Usuário (rodrigo) com assigned_franchise_ids = ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']
                    ↓
            Clica em "Resumo Gerencial"
                    ↓
            App.tsx chama fetchCampaignData()
                    ↓
            supabaseService.ts faz RPC call
                    ↓
            RPC filtra por franqueado... MAS QUAL?
                    ↓
            Se passar apenas 1, ou nenhum:
                    ↓
            Retorna dados vazios → mostra Total (0)
```

---

## ❌ Cenários Onde Quebra

### Cenário 1: RPC Esperando Franchise ID como Número
```sql
-- RPC ERRADA (assume um único ID numérico)
CREATE FUNCTION get_kpi_summary(p_franchise_id INT)
RETURNS TABLE(...) AS $$
  SELECT * FROM insights 
  WHERE franchise_id = p_franchise_id
$$

-- Problema: 
-- Se passar p_franchise_id = ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']
-- A RPC tenta comparar array com INT → Erro ou vazio
```

### Cenário 2: RPC Não Filtrando por Usuário Corretamente
```sql
-- RPC ERRADA (não respeita permissões multi-franqueado)
CREATE FUNCTION get_kpi_summary()
RETURNS TABLE(...) AS $$
  SELECT * FROM insights 
  WHERE 1=1
  -- Sem WHERE franchise_id IN (...)
$$

-- Problema:
-- Se o usuário é multi-franqueado, precisa filtrar por TODOS os franchises atribuídos
-- Não passar permissão = retorna vazio ou TODOS os dados
```

### Cenário 3: Filtro Aplicado no Frontend, Não no Backend
```typescript
// NO CÓDIGO FRONTEND - ERRADO para multi-franqueado
const filteredData = data.filter(d => 
  d.franqueado === selectedFranchise  // ← Filtra por APENAS 1
)

// Se usuário não seleciona nenhum franchise (porque dropdown não aparece):
// selectedFranchise = ''
// Retorna: nenhum dado → Total (0)
```

---

## 🔧 Solução (3 Passos)

### PASSO 1: Verificar a RPC que Agrega Dados (insights)

**Procure por**: Arquivo `supabaseService.ts` ou função `fetchCampaignData`

```typescript
❌ ERRADO (não funciona para multi-franqueado):
export const fetchCampaignData = async (startDate, endDate) => {
  const { data, error } = await supabase
    .rpc('get_campaign_summary', {
      p_start_date: startDate,
      p_end_date: endDate
      // ← FALTA: p_franchise_ids array
    });
  
  return data;
};

✅ CORRETO (funciona para multi-franqueado):
export const fetchCampaignData = async (startDate, endDate, franchiseIds?: string[]) => {
  const { data, error } = await supabase
    .rpc('get_campaign_summary', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_franchise_ids: franchiseIds || [] // ← Passa array de franqueados
    });
  
  if (error) {
    console.error('[Data] Error fetching campaign:', error);
    throw error;
  }
  
  return data;
};
```

### PASSO 2: Verificar a RPC SQL (no Supabase)

A RPC **deve aceitar um array** de franchise IDs:

```sql
❌ ERRADO:
CREATE OR REPLACE FUNCTION get_campaign_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM insights
  WHERE date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Problema: retorna TODOS os dados, independente do usuário
-- Resultado: mistura dados de todos os franqueados
-- Se no frontend filtra por 1, outros ficam vazios


✅ CORRETO:
CREATE OR REPLACE FUNCTION get_campaign_summary(
  p_start_date DATE,
  p_end_date DATE,
  p_franchise_ids TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date,
    franchise_name,
    account_name,
    SUM(investment) as total_investment,
    SUM(purchases) as total_purchases,
    SUM(leads) as total_leads,
    AVG(cpl) as avg_cpl,
    -- ... outros campos
  FROM insights
  WHERE date BETWEEN p_start_date AND p_end_date
    AND (
      -- Se array vazio ou NULL, retorna todos (para admin)
      array_length(p_franchise_ids, 1) IS NULL
      -- Se tem franchises, filtra por elas
      OR franchise_name = ANY(p_franchise_ids)
    )
  GROUP BY date, franchise_name, account_name;
END;
$$ LANGUAGE plpgsql;
```

### PASSO 3: Atualizar App.tsx para Passar Franchises

```typescript
❌ ANTES (não passa franchises para RPC):
useEffect(() => {
  if (!session || !userProfile) return;

  const loadData = async () => {
    const [campaignResult, franchiseList, kpiResult] = await Promise.all([
      fetchCampaignData(start, end), // ← FALTA franchiseIds
      fetchFranchises(),
      fetchKPIComparison(start, end), // ← FALTA franchiseIds
    ]);
  };
}, [session, userProfile, dateRange]);


✅ DEPOIS (passa franchises para RPC):
useEffect(() => {
  if (!session || !userProfile) return;

  const loadData = async () => {
    // Obter franchises do usuário
    const franchisesToFetch = availableFranchises.map(f => f.name);
    
    console.log('[App] Fetching data for franchises:', franchisesToFetch);
    
    const [campaignResult, franchiseList, kpiResult] = await Promise.all([
      fetchCampaignData(start, end, franchisesToFetch), // ✅ Passa franchises
      fetchFranchises(),
      fetchKPIComparison(start, end, franchisesToFetch), // ✅ Passa franchises
    ]);

    setData(campaignResult.current);
    setFormattedComparisonData(campaignResult.previous);
    setKpiRpcData(kpiResult);
  };
  
  loadData();
}, [session, userProfile, dateRange, availableFranchises]); // ← Adicionar availableFranchises
```

### PASSO 4: Atualizar fetchKPIComparison (para Saldo)

A função que busca saldo do `meta_ads_count` também precisa filtrar:

```typescript
❌ ANTES:
export const fetchKPIComparison = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('meta_ads_count')
    .select('*')
    .gte('data', startDate)
    .lte('data', endDate);
  
  return data;
};

✅ DEPOIS:
export const fetchKPIComparison = async (startDate, endDate, franchiseIds?: string[]) => {
  let query = supabase
    .from('meta_ads_count')
    .select('*')
    .gte('data', startDate)
    .lte('data', endDate);
  
  // Se tem franchises específicas, filtrar
  if (franchiseIds && franchiseIds.length > 0) {
    query = query.in('franqueado', franchiseIds);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[KPI] Error fetching balance:', error);
    throw error;
  }
  
  return data;
};
```

---

## 🧪 Testes para Validar Fix

### TESTE 1: Admin Vê Todos os Dados
```
1. Login como ADMIN
2. Ir para Resumo Gerencial
3. ✅ ESPERADO: Mostra Total com números > 0
4. ❌ NÃO ESPERADO: Total (0), dados vazios
```

### TESTE 2: Multi-Franqueado Vê Apenas Seus Dados
```
1. Login como rodrigo (multi-franqueado: GOIÂNIA + BRASÍLIA)
2. Ir para Resumo Gerencial
3. ✅ ESPERADO: 
   - Mostra dados agregados de GOIÂNIA + BRASÍLIA
   - Total > 0
   - Saldo aparece (não é R$ 0,00)
4. ❌ NÃO ESPERADO:
   - Total (0)
   - RS 0,00 em tudo
   - Console errors
```

### TESTE 3: Franqueado Único
```
1. Login como usuário franqueado de apenas 1 unidade
2. Ir para Resumo Gerencial
3. ✅ ESPERADO: Mostra apenas dados dessa unidade
4. ❌ NÃO ESPERADO: Total (0)
```

### TESTE 4: Console Debug
```
// No console, verificar logs:
[App] Fetching data for franchises: ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']
[Auth] Parsed franchises: ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']

// Se vir array vazio:
[App] Fetching data for franchises: []
// ← PROBLEMA! availableFranchises não está sendo populado
```

---

## 📋 Checklist (Para Seu Agente)

**Priority 1 - CRÍTICO**
- [ ] Verificar `fetchCampaignData()` - se aceita `franchiseIds` como parâmetro
- [ ] Verificar `fetchKPIComparison()` - se filtra por `franqueado`
- [ ] Verificar RPC SQL - se tem parâmetro `p_franchise_ids` e usa `= ANY()`

**Priority 2 - ALTO**
- [ ] Atualizar `App.tsx` para passar `availableFranchises` para as funções
- [ ] Adicionar logs: `console.log('[App] Fetching for franchises:', ...)`
- [ ] Testar: Admin vê tudo, multi-franqueado vê seus dados

**Priority 3 - MÉDIO**
- [ ] Adicionar error handling em fetchCampaignData
- [ ] Adicionar error handling em fetchKPIComparison
- [ ] Documentar no código por que franchiseIds é necessário

---

## 🚀 Resultado Esperado

Após as correções:

```
Usuário: rodrigo
Franchises: ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']
Data Range: 16 Dez - 15 Jan

↓ Sistema agora faz:
- RPC com p_franchise_ids = ['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']
- Filtra meta_ads_count por franqueado IN (...)

↓ Resultado:
✅ Resumo Gerencial carrega com dados
✅ Total > 0
✅ Saldo aparece (não é R$ 0,00)
✅ Dados apenas de GOIÂNIA e BRASÍLIA (não de BROOKLIN ou outros)
```

---

## 🔗 Arquivos a Revisar

1. **`src/services/supabaseService.ts`**
   - Função `fetchCampaignData()`
   - Função `fetchKPIComparison()`

2. **`src/App.tsx`**
   - useEffect que carrega dados
   - Como passa parâmetros para fetchCampaignData

3. **`Supabase Dashboard` → Functions**
   - RPC `get_campaign_summary` (ou similar)
   - Verificar se aceita e usa `p_franchise_ids`

---

## 💡 Resumo

| Problema | Causa | Fix | Prioridade |
|----------|-------|-----|----------|
| Resumo vazio para rodrigo | RPC não filtra por franchises | Adicionar param `p_franchise_ids` | 🔴 CRÍTICO |
| Saldo R$ 0,00 | Sem filtro no meta_ads_count | Adicionar WHERE franchise IN (...) | 🔴 CRÍTICO |
| Admin vê tudo, rodrigo vê nada | App não passa franchises ao RPC | Passar `availableFranchises` | 🟠 ALTO |

**Tempo Estimado**: 30-45 minutos
**Dificuldade**: Média (requer mudanças em SQL + TypeScript)

Quando seu agente fazer as mudanças, reporte os resultados dos testes! 🚀
