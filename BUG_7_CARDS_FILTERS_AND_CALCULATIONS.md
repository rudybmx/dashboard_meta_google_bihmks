# 🔴 BUG #7: Cards com Valores Incorretos & Filtros Não Aplicados

## 📋 Status do Novo Bug

**Data**: 16 de janeiro de 2026  
**Identificado**: Rodrigo (multi-franqueado)  
**Tela**: Visão Gerencial (Cards/KPIs)  
**Severidade**: CRÍTICO

---

## 🎯 O Problema

### Evidência (Screenshot):

```
CARD: SALDO DISPONÍVEL
  Mostra: R$ 257,69
  Status: ❌ Precisa verificar se está correto para a conta filtrada

CARD: INVESTIMENTO
  Mostra: R$ 61.090,25
  Comparação: Mês anterior: R$ 28.980,35
  Variação: -110.8% ❌ Valor de variação estranho!

CARD: COMPRAS
  Mostra: 0
  Status: ❌ Pode estar filtrando errado

CARD: LEADS (MSGS)
  Mostra: 78
  Status: ❌ Verificar se é apenas da conta selecionada

CARD: CPL (MÉDIO)
  Mostra: R$ 783,21
  Status: ❌ Cálculo pode estar errado

FILTROS:
  - OP7 | GOIÂNIA (selecionado)
  - AILLE ESTÉTICA (selecionado)
  - Data: 17 Dez, 00:02 - 16 Jan, 00:02

PROBLEMA: Os cards não estão sendo filtrados corretamente pela conta selecionada!
```

---

## 🔍 O Que Provavelmente Está Acontecendo

### Causa #1: Filtro Por Conta Não Está Sendo Aplicado (Probabilidade: 80%)

```typescript
// ❌ PADÃO ERRADO
const fetchKPIComparison = async (franchises?: string[]) => {
  const { data } = await supabase
    .from('insights')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    // ← FALTANDO: .eq('conta_nome', selectedAccount)
    // ← FALTANDO: .in('franchise_name', franchises)
  
  return data;
};

// Resultado: Retorna TODOS os dados, ignora filtro de conta
// Mesmo que usuário selecione "AILLE ESTÉTICA", traz todas as contas!
```

### Causa #2: Cálculo de Porcentagem (Mês Anterior) Está Errado (Probabilidade: 70%)

```typescript
// ❌ PADÃO ERRADO - Comparação incorreta
const monthVariation = ((current - previous) / previous * 100).toFixed(1);

// Resultado: -110.8% (impossível para diminuição!)
// Deveria ser máximo -100%

// Causa provável: previous value está muito pequeno ou zero
```

### Causa #3: Somas/Agregações Não Filtrando Por Conta (Probabilidade: 75%)

```typescript
// ❌ PADÃO ERRADO
const totalInvestment = data
  .reduce((sum, item) => sum + item.investment, 0);

// ← Isso soma TUDO, não filtra por conta selecionada!

// ✅ CORRETO:
const totalInvestment = data
  .filter(item => item.conta_nome === selectedAccount) // ← ADD FILTER
  .filter(item => item.franchise_name === selectedFranchise) // ← ADD FILTER
  .reduce((sum, item) => sum + item.investment, 0);
```

---

## 📊 Análise dos Cards

### Card: SALDO DISPONÍVEL

**Valores:**
```
Mostra: R$ 257,69
Conta filtrada: AILLE ESTÉTICA
Status: ❓ Pode estar certo ou errado
```

**Possíveis problemas:**
- ❌ Pode estar trazendo saldo de TODAS as contas, não só AILLE ESTÉTICA
- ❌ Pode estar usando data errada
- ✅ Provavelmente vem de `meta_ads_count` (verificar se filtra por account_name)

**SQL Esperado:**
```sql
SELECT SUM(balance) as saldo
FROM meta_ads_count
WHERE account_name = 'AILLE ESTÉTICA'
  AND franchise_name = 'OP7 | GOIÂNIA'
  AND date = CURRENT_DATE;
```

---

### Card: INVESTIMENTO

**Valores:**
```
Atual: R$ 61.090,25
Mês anterior: R$ 28.980,35
Variação: -110.8% ❌ ERRADO
```

**Problema Identificado:**
- ❌ Cálculo: (61.090,25 - 28.980,35) / 28.980,35 * 100 = 110.8%
- ❌ Mas aparece como "-110.8%" (com sinal negativo invertido!)
- ❌ Deveria ser "+110.8%" (aumento de 110%)

**Causa Provável:**
```typescript
// ❌ CÓDIGO ERRADO
const variation = ((current - previous) / previous * 100);
// Resultado: 110.8

// Mas é exibido como: -110.8% (sinal invertido em algum lugar!)
```

**Possíveis causas:**
1. Sinal invertido na exibição
2. Valores sendo puxados da ordem errada (previous > current)
3. Dados não estão sendo filtrados por conta
4. Cálculo está usando valores agregados incorretos

---

### Card: COMPRAS

**Valores:**
```
Mostra: 0
Status: ❌ Deve ter mais que zero
```

**Problema:**
- ❌ Não está filtrando por conta "AILLE ESTÉTICA"
- ❌ Pode estar procurando coluna errada (purchases vs compras)
- ❌ Filtro de data pode estar errado

---

### Card: LEADS

**Valores:**
```
Mostra: 78
Status: ❓ Pode estar puxando múltiplas contas
```

**Verificar:**
- Se 78 é APENAS de "AILLE ESTÉTICA"
- Se está usando SUM ou COUNT corretamente
- Se filtro de data está aplicado

---

### Card: CPL

**Valores:**
```
Mostra: R$ 783,21
Fórmula: Investimento / Leads
```

**Cálculo:**
```
Se Investment = R$ 61.090,25 e Leads = 78
Então: 61.090,25 / 78 = R$ 783,21 ✅ Cálculo correto

Mas: Se dados não estão filtrados, o cálculo fica errado!
```

---

## 🔧 Solução: Onde Procurar o Código

### Arquivo 1: `src/utils/supabaseService.ts`

**Procurar por:**
```typescript
export const fetchKPIComparison = async (...)
export const fetchCampaignData = async (...)
```

**Verificar:**
- Se tem `.eq('conta_nome', selectedAccount)` ou similar
- Se tem `.in('franchise_name', franchises)`
- Se tem filtro de data correto

---

### Arquivo 2: `src/pages/Visao/Gerencial.tsx` (ou similar)

**Procurar por:**
```typescript
const calculateVariation = (current, previous) => { ... }
const totalInvestment = data.reduce(...)
const totalLeads = data.reduce(...)
```

**Verificar:**
- Se está filtrando `data` antes de fazer somas
- Se cálculo de variação está correto
- Se está usando `selectedAccount` e `selectedFranchise`

---

### Arquivo 3: `src/components/KPICards.tsx` ou similar

**Procurar por:**
```typescript
<KPICard
  title="INVESTIMENTO"
  value={totalInvestment}
  variation={monthVariation}
/>
```

**Verificar:**
- Se `totalInvestment` está sendo filtrado por conta
- Se `monthVariation` está sendo calculado corretamente
- Se dados estão vindo filtrados do service

---

## 🔍 Checklist de Diagnóstico

```
[ ] Abrir DevTools (F12) → Network tab
[ ] Filtrar por "insight" ou "kpi"
[ ] Clicar em um dos requests
[ ] Ir para: Response tab
[ ] Verificar se dados retornados tém APENAS conta selecionada
    - Se tem múltiplas contas = PROBLEMA!
    - Se tem apenas AILLE ESTÉTICA = OK

[ ] Verificar Response:
    [ ] Há campo "conta_nome"?
    [ ] Está filtrando por "AILLE ESTÉTICA"?
    [ ] Ou está trazendo ["ODONTO7", "AILLE", "PRIME", ...]?

[ ] Verificar source code:
    [ ] ResmoGerencial.tsx tem selectedAccount?
    [ ] É passado para fetchKPIComparison()?
    [ ] supabaseService.ts filtra por conta?
```

---

## ✅ Soluções Recomendadas

### Fix #1: Adicionar Filtro de Conta no Service

```typescript
// Em supabaseService.ts

export const fetchKPIComparison = async (
  startDate: string,
  endDate: string,
  franchiseFilter?: string[],
  accountFilter?: string[] // ← ADD THIS
): Promise<KPIData[]> => {
  let query = supabase
    .from('insights')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  // ✅ ADD: Filtro de franchise
  if (franchiseFilter && franchiseFilter.length > 0) {
    query = query.in('franchise_name', franchiseFilter);
  }

  // ✅ ADD: Filtro de conta
  if (accountFilter && accountFilter.length > 0) {
    query = query.in('conta_nome', accountFilter);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('[fetchKPIComparison] Error:', error);
    return [];
  }

  return data;
};
```

---

### Fix #2: Passar selectedAccount para Fetcher

```typescript
// Em Gerencial.tsx ou component que usa cards

useEffect(() => {
  if (!selectedAccount) return;
  
  const data = await fetchKPIComparison(
    startDate,
    endDate,
    availableFranchises.map(f => f.name),
    [selectedAccount] // ← ADD THIS
  );
  
  setKPIData(data);
}, [selectedAccount, startDate, endDate, availableFranchises]);
```

---

### Fix #3: Corrigir Cálculo de Variação

```typescript
// Verificar se está usando Math.round ou toFixed corretamente

const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return 0; // Evitar divisão por zero
  
  const variation = ((current - previous) / Math.abs(previous)) * 100;
  return parseFloat(variation.toFixed(1));
};

// Uso:
const investmentVariation = calculateVariation(
  currentMonthInvestment,
  previousMonthInvestment
);

// Resultado esperado:
// current = 61.090, previous = 28.980
// (61.090 - 28.980) / 28.980 * 100 = 110.8% (crescimento)
```

---

### Fix #4: Agregar Dados Corretamente

```typescript
// ❌ ERRADO:
const totalInvestment = kpiData.reduce(
  (sum, item) => sum + item.investment,
  0
);

// ✅ CORRETO:
const totalInvestment = kpiData
  .filter(item => item.conta_nome === selectedAccount)
  .reduce((sum, item) => sum + item.investment, 0);
```

---

## 📋 Plano de Ação

### HOJE - Priority 1 (Crítico):

```
[ ] Passo 1: Diagnosticar com DevTools
    [ ] F12 → Network tab
    [ ] Filter "insight" ou "kpi"
    [ ] Clicar em request
    [ ] Response tab
    [ ] Verificar se dados retornados estão filtrados
    
[ ] Passo 2: Se dados NÃO estão filtrados:
    [ ] Abrir supabaseService.ts
    [ ] Encontrar fetchKPIComparison
    [ ] Adicionar: .in('conta_nome', accountFilter)
    [ ] Passar selectedAccount no useEffect
    
[ ] Passo 3: Se dados ESTÃO filtrados mas cards errados:
    [ ] Procurar por cálculos (investimento, leads, cpl)
    [ ] Verificar se está fazendo .filter antes de .reduce
    [ ] Verificar cálculo de variação (mês anterior)
    
[ ] Passo 4: Testar
    [ ] npm run dev
    [ ] Selecionar conta "AILLE ESTÉTICA"
    [ ] Verificar se cards mudam
    [ ] F12 → Network verificar filters no URL
    
[ ] Passo 5: Commit & Push
```

---

## 🎯 Resultado Esperado Após Fix

```
Antes:
  INVESTIMENTO: R$ 61.090,25
  Variação: -110.8% ❌
  Status: Mostra dados de TODAS as contas

Depois:
  INVESTIMENTO: R$ XXX (dados APENAS de AILLE ESTÉTICA)
  Variação: +110.8% ou -50% etc (correto!)
  Status: Quando muda conta → Cards atualizam ✅
```

---

## 🔍 Próxima Ação

**Você consegue me fornecer:**

1. **Screenshot do DevTools**:
   - F12 → Network tab
   - Filter "insight"
   - Click em um request
   - Response tab

2. **Output do console** (F12 → Console):
   - Há erros?
   - Valores sendo logados?

3. **Nome do arquivo** com os cards (Gerencial.tsx? KPICards.tsx?)

Com isso, vou gerar o fix exato em 15 minutos! 🚀
