# 🔍 Quick Debug Guide - Resumo Gerencial

## O Problema em 30 Segundos

```
rodrigo (multi-franqueado: GOIÂNIA + BRASÍLIA)
        ↓
    Clica em Resumo Gerencial
        ↓
    Vê: Total (0) | R$ 0,00
        ↓
    ESPERADO: Dados de GOIÂNIA + BRASÍLIA agregados
```

## As 3 Causas Possíveis

### ❌ Causa 1: App.tsx não passa franchises para RPC
```typescript
// AGORA (errado):
fetchCampaignData(start, end)  // Sem franchises

// DEVERIA SER (correto):
fetchCampaignData(start, end, availableFranchises.map(f => f.name))
```

**Como verificar no console:**
```javascript
// Se vê isso:
[App] Fetching data for franchises: []
// É este o problema!
```

---

### ❌ Causa 2: RPC SQL não filtra por franchises
```sql
-- AGORA (retorna tudo ou nada):
WHERE date BETWEEN p_start_date AND p_end_date

-- DEVERIA SER (filtra por franchises):
WHERE date BETWEEN p_start_date AND p_end_date
  AND franchise_name = ANY(p_franchise_ids)
```

**Como verificar no Supabase:**
1. Vá para: Dashboard → SQL Editor
2. Execute esta query:
```sql
SELECT * FROM insights
WHERE date >= '2026-01-01'
AND franchise_name = 'OP7 | GOIÂNIA'
LIMIT 1;
```
3. Se retorna dados: OK ✅
4. Se retorna vazio: Problema no banco ou RPC

---

### ❌ Causa 3: fetchKPIComparison não filtra saldo
```typescript
// AGORA (pega saldo de TODOS):
const { data } = await supabase
  .from('meta_ads_count')
  .select('*')
  .gte('data', startDate)
  .lte('data', endDate);

// DEVERIA SER (filtra por franchises):
if (franchiseIds && franchiseIds.length > 0) {
  query = query.in('franqueado', franchiseIds);
}
```

**Como verificar no console:**
```javascript
// Se saldo aparece como R$ 0,00 mas deveria ter valor:
console.log(kpiRpcData);  // Verificar se está vazio ou null
```

---

## 🧪 Teste Rápido (5 minutos)

```bash
# 1. Abra o navegador em localhost:3000
# 2. Login com rodrigo/senha
# 3. Ir para Resumo Gerencial
# 4. Abra console (F12)
# 5. Procure por:
#    [App] Fetching data for franchises: ...
```

**Se vê:**
- `['OP7 | GOIÂNIA', 'OP7 | BRASÍLIA']` ✅ App está OK
- `[]` (array vazio) ❌ App não passa franchises
- Nada (sem log) ❌ Log não foi adicionado

---

## 🔧 3 Minutos para Ficar Pronto

### Step 1: Verificar App.tsx (1 min)

Procure por:
```typescript
const loadData = async () => {
  const [campaignResult, ...] = await Promise.all([
    fetchCampaignData(start, end), // ← AQUI
```

Mude para:
```typescript
const franchisesToFetch = availableFranchises.map(f => f.name);
const [campaignResult, ...] = await Promise.all([
  fetchCampaignData(start, end, franchisesToFetch), // ← AGORA PASSA
```

### Step 2: Verificar supabaseService.ts (1 min)

Procure por:
```typescript
export const fetchCampaignData = async (startDate, endDate) => {
```

Mude para:
```typescript
export const fetchCampaignData = async (startDate, endDate, franchiseIds?: string[]) => {
  // ... passar franchiseIds para RPC
```

### Step 3: Verificar RPC SQL (1 min)

No Supabase, procure por RPC que faz SUM de dados e adicione:
```sql
AND franchise_name = ANY(p_franchise_ids)
```

---

## 📋 Checklist Rápido

- [ ] App.tsx passa `availableFranchises` ao `fetchCampaignData()`
- [ ] `fetchCampaignData()` aceita parâmetro `franchiseIds`
- [ ] RPC no Supabase filtra por `franchise_name = ANY(p_franchise_ids)`
- [ ] `fetchKPIComparison()` filtra por `franqueado IN (...)`
- [ ] Console mostra: `[App] Fetching data for franchises: ['OP7 | GOIÂNIA', ...]`
- [ ] Resumo Gerencial carrega com dados (Total > 0)

---

## 🚀 Próximas Ações

1. Seu agente aplica os 3 fixes
2. Recarrega página (F5)
3. Login com rodrigo
4. Verifica console para logs
5. Verifica se Resumo Gerencial mostra dados

**Se funcionar** ✅: Teste com outro usuário multi-franqueado
**Se não funcionar** ❌: Envie a saída do console para debug adicional

