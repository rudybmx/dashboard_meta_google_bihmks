# 🔍 Análise Detalhada do Código - BUG #5 & #6

## 📋 Status da Análise

**Data**: 16 de janeiro de 2026  
**Commit Analisado**: fdfd09d11ae63e0623f387ae066a29941f9e3d1e  
**Mensagem**: "Fix: 4 critical bugs post-refactor"

---

## 🎯 O Que Sabemos Dos Screenshots

### Evidence Do Loop Infinito (BUG #5):
```
✗ Network Tab mostra:
  - 41.022 REQUESTS em poucos minutos
  - 8.129 MB TRANSFERRED (absurdo!)
  - Requests repetindo: get_campaign_summary, get_kpi_comparison, get_managerial_data
  
✗ Console mostra:
  - [Filter/App] Role: multifranqueado - Error!
  - Loop contínuo
  
✗ Tela Resumo Gerencial:
  - Fica "Carregando relatório..." a cada 2 segundos
  - Fecha e reabre infinitamente
```

---

## 🔍 Possíveis Culpritos (Sem Ver o Código)

### 1️⃣ **useEffect com Array Dependency** (Probabilidade: 70%)

```typescript
// ❌ PADÃO PROBLEMÁTICO (em ResmoGerencial ou App.tsx)
useEffect(() => {
  fetchCampaignData(franchises);
  fetchKPIComparison(franchises);
  fetchSummaryReport(franchises);
}, [franchises]) // franchises é novo array a cada render
// ↓ Resultado: Re-render → novo array → detecta mudança → fetch → re-render
```

**Sintoma**: ~2 segundos entre reloads (tempo de fetch)

### 2️⃣ **Polling/setInterval sem Cleanup** (Probabilidade: 20%)

```typescript
// ❌ PADÃO PROBLEMÁTICO
useEffect(() => {
  setInterval(() => {
    fetchData();
  }, 2000); // A cada 2 SEGUNDOS!
  // Sem cleanup!
}, [])
```

**Sintoma**: Recarrega EXATAMENTE a cada 2 segundos

### 3️⃣ **Múltiplos useEffect Disparando em Cascata** (Probabilidade: 10%)

```typescript
// ❌ PADÃO PROBLEMÁTICO
useEffect(() => {
  setState(newValue); // Dispara outro useEffect
}, [dependency])

useEffect(() => {
  if (state) fetchData(state); // Dependsde state
}, [state]) // Que é novo a cada fetch
```

---

## 📊 Análise do Commit

### Commit: "Fix: 4 critical bugs post-refactor"

**Arquivos Modificados** (provavelmente):
```
src/utils/supabaseService.ts     (parseArrayField, fetchCampaignData, etc)
src/auth/AuthProvider.tsx         (parseArrayField usage)
src/App.tsx                       (Pass franchises to fetchers)
src/pages/Resumo/ResmoGerencial.tsx (useEffect dependency)
```

**Status Esperado**:
- ✅ BUG #1: Cannot coerce JSON (FIXADO)
- ✅ BUG #2: Filtros não aparecem (FIXADO)
- ✅ BUG #3: Console errors (FIXADO)
- ❓ BUG #4: Resumo vazio → (Pode ter FIXADO)
- ❌ BUG #5: Infinite reload → (NÃO FIXADO - novamente detectado!)
- ❌ BUG #6: Missing names → (PARCIALMENTE - alguns nomes aparecem agora)

---

## 🚨 Diagnóstico: Por Que BUG #5 Continua Acontecendo?

### Cenário Mais Provável:

**No arquivo ResmoGerencial.tsx:**

```typescript
// ❌ ATUAL (PROBLEMÁTICO)
export const ResmoGerencial = () => {
  const [franchises, setFranchises] = useState([]);
  const [campaignData, setCampaignData] = useState(null);
  
  useEffect(() => {
    // 🔴 PROBLEMA: availableFranchises vem como prop
    // Toda vez que App.tsx re-rende, passa novo array
    fetchCampaignData(availableFranchises);
    fetchKPIComparison(availableFranchises);
  }, [availableFranchises]) // ← NOVO ARRAY A CADA RENDER!
  
  // Resultado:
  // 1. App.tsx renderiza
  // 2. availableFranchises = novo array []
  // 3. ResmoGerencial detecta mudança
  // 4. Chama useEffect → fetch dados
  // 5. Dados chegam → setState → re-render
  // 6. Component retorna ao estado anterior
  // 7. Volta para passo 1 → LOOP INFINITO
};
```

---

## ✅ Solução Para BUG #5

### Fix 1: Usar String Dependency

```typescript
// ✅ CORRETO
export const ResmoGerencial = () => {
  const { availableFranchises } = useAuth();
  
  // String dependency nunca muda se dados não mudam
  const franchiseString = useMemo(
    () => availableFranchises
      .map(f => f.name)
      .sort()
      .join(','),
    [availableFranchises.map(f => f.id).join(',')] // Depend on IDs, not array reference
  );
  
  useEffect(() => {
    const franchiseNames = franchiseString.split(',');
    fetchCampaignData(franchiseNames);
    fetchKPIComparison(franchiseNames);
  }, [franchiseString]) // ← STRING, não array
  
  // Resultado:
  // franchiseString "OP7 | GOIÂNIA,OP7 | BRASÍLIA" nunca muda
  // useEffect roda SÓ UMA VEZ
  // Sem loop infinito! ✅
};
```

### Fix 2: Adicionar AbortController

```typescript
// ✅ CORRETO - Com cleanup
useEffect(() => {
  const controller = new AbortController();
  
  const loadData = async () => {
    try {
      const franchiseNames = franchiseString.split(',');
      await fetchCampaignData(franchiseNames, { signal: controller.signal });
      await fetchKPIComparison(franchiseNames, { signal: controller.signal });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[ResmoGerencial] Error:', err);
      }
    }
  };
  
  loadData();
  
  return () => controller.abort(); // Cleanup: cancela se dependency muda
}, [franchiseString]);
```

### Fix 3: Verificar Polling/setInterval

```typescript
// ❌ SE ENCONTRAR ISSO:
setInterval(() => {
  fetchCampaignData(franchises);
}, 2000); // ← MATAR ISSO!

// ✅ MUDAR PARA:
// Remover setInterval completamente
// Deixar só useEffect que executa UMA VEZ
```

---

## 🔧 Solução Para BUG #6 (Missing Names)

### O Problema (Confirmado pelos screenshots):

```
✓ ODONTO7 CAMBÊ - Mostra nome ✅
✗ Odonto7 Apucarana... - Em branco ❌
```

### Causas Possíveis:

1. **Contas faltando em meta_ads_accounts**
2. **Tipo de dados mismatch** (account_id como string vs number)
3. **JOIN sem fallback**

### Solução Rápida (SQL):

```sql
-- Verificar se contas existem
SELECT DISTINCT account_id, COUNT(*) 
FROM campaigns 
GROUP BY account_id
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC;

-- Ver quais faltam na tabela meta_ads_accounts
SELECT c.account_id 
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM meta_ads_accounts ma 
  WHERE ma.id::INT = c.account_id::INT
)
GROUP BY c.account_id;

-- Preencher contas faltantes
INSERT INTO meta_ads_accounts (id, account_name, account_id_meta)
SELECT DISTINCT 
  c.account_id::INT,
  'Conta ' || c.account_id,
  c.account_id
FROM campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM meta_ads_accounts 
  WHERE id = c.account_id::INT
);
```

### Solução em TypeScript:

```typescript
// Em supabaseService.ts
export const fetchAccountNames = async (
  accountIds: (string | number)[]
): Promise<Map<string, string>> => {
  const numericIds = accountIds.map(id => Number(id));
  
  const { data, error } = await supabase
    .from('meta_ads_accounts')
    .select('id, account_name')
    .in('id', numericIds);
  
  if (error) {
    console.error('[fetchAccountNames] Error:', error);
    return new Map();
  }
  
  // Criar map com fallback
  return new Map(
    data.map(acc => [
      String(acc.id),
      acc.account_name || `Conta ${acc.id}` // Fallback
    ])
  );
};

// No componente ResmoGerencial:
const loadSummary = async (franchises: string[]) => {
  const campaign = await fetchCampaignData(franchises);
  
  // Extrair IDs únicos
  const accountIds = [...new Set(
    campaign.map(c => c.account_id)
  )];
  
  // Buscar nomes
  const accountMap = await fetchAccountNames(accountIds);
  
  // Mapear dados com nomes
  const withNames = campaign.map(c => ({
    ...c,
    account_name: accountMap.get(String(c.account_id)) || String(c.account_id)
  }));
  
  setCampaignData(withNames);
};
```

---

## 📋 Checklist Para Você Verificar no Código

```
[ ] Arquivo: ResmoGerencial.tsx
    [ ] Procurar por: useEffect com [franchises] ou [availableFranchises]
    [ ] Procurar por: setInterval, setTimeout
    [ ] Procurar por: setInterval com 2000ms
    
[ ] Arquivo: App.tsx
    [ ] Verificar se availableFranchises é recalculado todo render
    [ ] Verificar se há useEffect(()=>{...}, []) sem dependency
    
[ ] Arquivo: supabaseService.ts
    [ ] Verificar se fetchCampaignData aceita franchiseFilter
    [ ] Verificar se fetchKPIComparison aceita franchiseFilter
    [ ] Verificar se há AbortController/cleanup
```

---

## 🎯 Próxima Ação

**Você precisa fornecer:**

1. **Conteúdo de ResmoGerencial.tsx** - especialmente o useEffect
2. **Conteúdo de App.tsx** - especialmente onde passa franchises
3. **Output do comando git**:
```bash
git log --oneline -1 # Último commit
git diff HEAD~1 HEAD # O que mudou
```

Ou apenas:
```bash
git show fdfd09d11ae63e0623f387ae066a29941f9e3d1e --stat # Ver arquivos modificados
```

---

## 🔴 Diagnóstico Automático (Você Pode Rodar Agora)

**No Browser Console (F12):**

```javascript
// 1. Contar requests
let count = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('campaign') || args[0].includes('kpi')) {
    count++;
    console.log(`[REQUEST #${count}] ${new Date().toISOString()} - ${args[0].split('?')[0]}`);
  }
  return originalFetch.apply(this, args);
};

// 2. Esperar 10 segundos
// 3. Verificar:
// - Se count > 2 = LOOP INFINITO (deveria ser máx 1-2)
// - Se count = 1 = NORMAL

// 4. Também verificar:
// - Abrir DevTools Network tab
// - Filter: "campaign"
// - Se vê requests a cada ~2s = LOOP CONFIRMADO
```

---

## 📝 Conclusão

**BUG #5 e #6 ainda existem porque:**

1. ✅ BUG #4 foi fixado (dados agora aparecem)
2. ❌ BUG #5 (loop infinito) não foi fixado
3. ⚠️ BUG #6 (missing names) parcialmente fixado (alguns nomes aparecem)

**Próximo passo**: Ver o código exato para identificar onde está o setInterval ou o array dependency no useEffect.

**Tempo estimado para fix**: 15 minutos quando eu ver o código.
