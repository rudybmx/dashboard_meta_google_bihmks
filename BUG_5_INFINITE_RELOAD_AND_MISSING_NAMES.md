# 🔴 BUG #5 & #6: Infinite Reload + Missing Account Names

## 📋 Problemas Identificados

**Data**: 15 de janeiro de 2026  
**User**: rodrigo (multi-franqueado)  
**Tela**: Resumo Gerencial  
**Severidade**: CRÍTICO + ALTO

---

## 🔴 BUG #5: Resumo Gerencial Recarrega Infinitamente (A Cada ~2 segundos)

### Sintomas
```
✓ Tela abre normalmente
✓ Mostra dados OK
✗ A cada ~2 segundos: Tela fecha/recarrega com "Carregando relatório..."
✗ Ciclo infinito: fecha → abre → fecha → abre...
✗ Impede usar a tela
```

### Possíveis Causas (Em Ordem de Probabilidade)

#### 🎯 Causa #1: Dependency Array Incorreto no useEffect (MAIS PROVÁVEL)
**Localização**: Arquivo com o componente Resumo Gerencial

**Padrão de Código Problemático:**
```typescript
// ❌ ERRADO - Causa re-render infinito
useEffect(() => {
  fetchCampaignData(franchises); // franchises é um array novo a cada render
}, [franchises]) // Array como dependency = new reference a cada render

// OU

useEffect(() => {
  fetchCampaignData(franchises);
}, [franchises.toString()]) // toString() cria nova string a cada render

// OU (MAIS COMUM)

useEffect(() => {
  const franchiseNames = availableFranchises.map(f => f.name);
  fetchCampaignData(franchiseNames);
}, [availableFranchises]) // availableFranchises é new array a cada render de App.tsx
```

**Resultado**:
```
1. App.tsx renderiza
2. availableFranchises = novo array []
3. Resumo Gerencial detecta mudança
4. useEffect executa fetchCampaignData
5. Fetch completa → Re-render
6. Volta para passo 2 → LOOP INFINITO
```

**Solução**:
```typescript
// ✅ CORRETO - Usa string simples como dependency
const franchiseString = availableFranchises
  .map(f => f.name)
  .sort()
  .join(','); // "OP7 | GOIÂNIA,OP7 | BRASÍLIA"

useEffect(() => {
  fetchCampaignData(franchises);
}, [franchiseString]) // String não muda se franchises não mudam

// OU - Usar useMemo
const memoFranchises = useMemo(
  () => availableFranchises.map(f => f.name),
  [availableFranchises.map(f => f.id).join(',')] // Memoize based on IDs
);

useEffect(() => {
  fetchCampaignData(memoFranchises);
}, [memoFranchises])
```

---

#### 🎯 Causa #2: setInterval ou setTimeout Sem Cleanup

**Padrão Problemático:**
```typescript
// ❌ ERRADO
useEffect(() => {
  const interval = setInterval(() => {
    fetchCampaignData(franchises);
  }, 2000); // A cada 2 segundos = RECARREGAMENTO INFINITO
  
  // Sem return cleanup
}, [franchises])
```

**Solução**:
```typescript
// ✅ CORRETO
useEffect(() => {
  const interval = setInterval(() => {
    fetchCampaignData(franchises);
  }, 120000); // 2 MINUTOS, não 2 SEGUNDOS

  return () => clearInterval(interval); // CLEANUP
}, [franchises])
```

---

#### 🎯 Causa #3: Fetch Sem Abort/Cancellation

**Padrão Problemático:**
```typescript
// ❌ ERRADO
useEffect(() => {
  fetchCampaignData(franchises); // 3 segundos para completar
  fetchKPIComparison(franchises); // 2 segundos
  // Enquanto está buscando, novo useEffect é disparado
  // Antes da resposta anterior chegar
}, [franchises]) // franchises muda a cada render
```

**Resultado**: 
```
Tempo 0: Fetch #1 iniciado (3s)
Tempo 1: Novo render detecta franchises changed
Tempo 1: Fetch #2 iniciado (3s) 
Tempo 1: Novo render detecta franchises changed
... = 30+ requests simultâneos em fila
```

**Solução**:
```typescript
useEffect(() => {
  const controller = new AbortController();
  
  const loadData = async () => {
    try {
      await fetchCampaignData(franchises, { signal: controller.signal });
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    }
  };
  
  loadData();
  
  return () => controller.abort(); // Cancela se dependencies mudam
}, [franchiseString]) // Use string, não array
```

---

### Passos para Diagnosticar

**No Browser DevTools Console:**
```javascript
// 1. Abra a tela Resumo Gerencial
// 2. Cole no console:

// Contar quantas vezes fetchCampaignData é chamado
let fetchCount = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('campaign')) {
    fetchCount++;
    console.log(`[FETCH COUNT] ${fetchCount} - ${new Date().toISOString()}`);
  }
  return originalFetch.apply(this, args);
};

// 3. Espere 5 segundos
// 4. Veja quantas vezes "campaign" foi fetchado
// - Se > 2 em 5 segundos = LOOP INFINITO
// - Se exatamente 1 = Normal
```

---

## 🟠 BUG #6: Coluna "Contas" Não Mostra Nome de Alguns Clientes

### Sintomas
```
✓ Alguns clientes mostram o nome correto
✗ Outros clientes aparecem em branco/vazio
✗ Ou aparecem com ID em vez de nome
✗ Afeta apenas alguns rows
```

### Causa Provável: JOIN com `meta_ads_accounts` Incompleto

**Problema**: 
```sql
-- ❌ WRONG - OUTER JOIN sem fallback
SELECT 
  c.name,
  acc.account_name  -- Se não encontrar conta, NULL
FROM campaigns c
LEFT JOIN meta_ads_accounts acc ON c.account_id = acc.id

-- Resultado:
-- "Campanha 1" | "Facebook Account"  ✅
-- "Campanha 2" | NULL                ❌ Campo vazio
```

**Causa Raiz**:
1. **account_id mismatch**: `c.account_id` = 5, mas `meta_ads_accounts` tem id = "5" (string)
2. **Dados incompletos**: Algumas contas não estão na tabela `meta_ads_accounts`
3. **JOIN errado**: LEFT JOIN deveria ser INNER ou ter fallback

---

### Solução para Coluna Contas

#### Opção 1: Fallback para ID se Nome Não Existir
```sql
-- ✅ CORRETO com FALLBACK
SELECT 
  c.name,
  COALESCE(acc.account_name, c.account_id::TEXT) as account_name
  -- Se account_name é NULL, mostrar ID
FROM campaigns c
LEFT JOIN meta_ads_accounts acc 
  ON c.account_id = acc.id::INT  -- Garante conversão de tipo
ORDER BY c.name;
```

#### Opção 2: Lazy Load / Populate Missing Accounts
```typescript
// Em supabaseService.ts
const fetchAccountNames = async (accountIds: (string | number)[]): Promise<Map<string, string>> => {
  const { data, error } = await supabase
    .from('meta_ads_accounts')
    .select('id, account_name')
    .in('id', accountIds.map(id => Number(id))); // Garantir number

  if (error) {
    console.error('Erro fetching account names:', error);
    return new Map(); // Retornar mapa vazio
  }

  // Criar map id → name
  return new Map(
    data.map(acc => [String(acc.id), acc.account_name || String(acc.id)])
  );
};

// Usar no componente:
const campaignData = await fetchCampaignData(franchises);
const accountIds = [...new Set(campaignData.map(c => c.account_id))];
const accountNames = await fetchAccountNames(accountIds);

// Render:
campaignData.forEach(c => {
  c.account_name = accountNames.get(String(c.account_id)) || String(c.account_id);
});
```

#### Opção 3: Preencher Dados Faltantes no Banco
```sql
-- Adicionar contas que faltam:
INSERT INTO meta_ads_accounts (id, account_name, account_id_meta)
SELECT DISTINCT 
  c.account_id,
  'Nome Genérico ' || c.account_id,
  c.account_id
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM meta_ads_accounts 
  WHERE id = c.account_id::INT
);
```

---

## 🔧 Diagnóstico Rápido (5 Minutos)

### Para BUG #5 (Infinite Reload):
```bash
# 1. Abra DevTools (F12)
# 2. Vá para "Network" tab
# 3. Filter por "campaign" ou "kpi"
# 4. Abra Resumo Gerencial
# 5. Observe:
#    - Se requests aparecem a cada 2s = LOOP CONFIRMADO
#    - Se só aparecem 1-2 requests = Normal
```

### Para BUG #6 (Missing Names):
```sql
-- Executar no Supabase SQL Editor:

SELECT 
  COUNT(*) as total_campaigns,
  COUNT(CASE WHEN account_id IS NOT NULL THEN 1 END) as campaigns_com_account_id,
  COUNT(DISTINCT account_id) as unique_account_ids,
  COUNT(CASE WHEN EXISTS (
    SELECT 1 FROM meta_ads_accounts 
    WHERE id = campaigns.account_id::INT
  ) THEN 1 END) as accounts_que_existem
FROM campaigns
WHERE date >= NOW() - INTERVAL '30 days';

-- Resultado:
-- total_campaigns | com_id | unique | que_existem
-- 150             | 145    | 12     | 8           ← Faltam 4 contas!
```

---

## 📋 Checklist para Implementação

### Para BUG #5:
```
[ ] Identificar arquivo do componente Resumo Gerencial
[ ] Encontrar useEffect que chama fetchCampaignData
[ ] Verificar dependency array
[ ] Se dependency é array → MUDAR PARA STRING
[ ] Se tem setInterval → ADICIONAR CLEANUP + clearInterval
[ ] Se tem fetch sem AbortController → ADICIONAR
[ ] Testar: Abrir Resumo, esperar 10s, verificar se não recarrega
```

### Para BUG #6:
```
[ ] Verificar RPC ou query que traz campaigns
[ ] Adicionar COALESCE para fallback (nome ou ID)
[ ] Testar com accounts que não existem
[ ] Verificar tabela meta_ads_accounts tem todas as contas
[ ] Se faltam contas → Executar INSERT para preencher
[ ] Testar: Verificar se TODOS os rows mostram nome ou ID
```

---

## 🎯 Próxima Ação

Você consegue me fornecer:

1. **Screenshot do Network tab** mostrando os requests que se repetem?
2. **Nome do arquivo** do componente Resumo Gerencial (es `ResmoGerencial.tsx` ou outro)?
3. **O output do SQL query** acima (quantas contas existem vs quantas campaigns usam)?

Com isso vou criar fix exato em 15 minutos! 🚀
