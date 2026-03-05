# Documentação de Métricas e Regras de Negócio - Dashboard OP7

Este documento serve como a "Fonte Única da Verdade" (Single Source of Truth) para todos os cálculos e métricas exibidos no dashboard. O objetivo é garantir consistência entre os relatórios Gerenciais, Financeiros e por Objetivo.

## 1. Regra de Negócio de Leads

A definição de "Lead" no sistema é unificada para evitar discrepâncias entre diferentes tipos de campanhas.

### Fórmula Geral (Leads Geral)
`Leads Geral = Leads de Mensagem + Leads de Cadastro`

### Componentes da Fórmula:
- **Leads de Mensagem**: Soma da coluna `msgs_iniciadas` proveniente da View de dados.
- **Leads de Cadastro**: Soma da coluna `leads_total`, mas **APENAS** se o objetivo da campanha/anúncio contiver as palavras "cadastro" ou "lead" (case-insensitive).
    - *Nota*: Se o objetivo for "Vendas" ou "Engajamento", o `leads_total` é ignorado para evitar contagem duplicada ou incorreta, priorizando `msgs_iniciadas`.

### Implementação Técnica:
A lógica está centralizada em `src/utils/dataAggregation.ts`, na função `calculateMetrics`:
```typescript
const isCadastro = objective.includes('cadastro') || objective.includes('lead');
const rowLeadsCadastro = isCadastro ? rowLeadsTotal : 0;
const rowLeadsGeral = rowMsgsIniciadas + rowLeadsCadastro;
```

---

## 2. Métricas de Performance (KPIs)

| Métrica | Nome no Sistema | Cálculo / Origem |
| :--- | :--- | :--- |
| **Investimento** | `investimento` / `valor_gasto` | Valor bruto gasto na plataforma (Meta/Google). |
| **CPL (Geral)** | `cpl_total` | `Investimento / Leads Geral` |
| **CPC** | `cpc` | `Investimento / Cliques (Todos)` |
| **CTR** | `ctr` | `(Cliques (Todos) / Impressões) * 100` |
| **CPM** | `cpm` | `(Investimento / Impressões) * 1000` |
| **Frequência** | `frequencia` | `Impressões / Alcance` |
| **CPR (Resultado)** | `cpr` | `Investimento / (Compras + Leads Geral)` |

---

## 3. Regras do Resumo Financeiro (Saldos)

O saldo exibido no "Resumo Gerencial" reflete o valor atual disponível nas contas de anúncio.

### Origem dos Dados:
- O campo `saldo_atual` é extraído da View `vw_dashboard_unified`.
- O valor é populado via integração com a tabela `tb_meta_ads_contas`.

### Regra de Agregação (Prevenção de Duplicidade):
Como os dados de performance são diários, mas o saldo é um valor "estático" atual, o sistema aplica a seguinte regra:
- **Atribuição Única**: O saldo de uma conta é computado apenas uma vez por período selecionado. Se os dados retornarem múltiplas linhas para a mesma conta, apenas a primeira ocorrência do saldo é considerada para o cálculo do `totalBalance`.

---

## 4. Estrutura de Camadas (FSD - Feature-Sliced Design)

O projeto segue a arquitetura FSD para garantir escalabilidade:
- **App**: Configurações globais e provedores.
- **Pages**: Composições de alto nível (ex: `SummaryView`).
- **Widgets**: Componentes complexos e autocontidos (ex: `KPISection`, `MainCharts`).
- **Features**: Lógicas de interação (ex: filtros de data/clínica).
- **Entities**: Lógica de domínio e modelos de dados (ex: `finance`, `cluster`).
- **Shared**: Componentes de UI genéricos (shadcn), utilitários e tipos.

---

## 5. Instruções para o Agente (Suporte de Programação)

Ao atuar no sistema, o agente deve:
1.  **Priorizar Hooks**: Sempre que possível, utilize ou crie hooks para separar a lógica da UI (ex: `useFinanceData`).
2.  **Seguir FSD**: Respeite a hierarquia de pastas. Não importe de camadas superiores para inferiores.
3.  **Tipagem Estrita**: Use as interfaces definidas em `entities/{module}/model/types.ts`.
4.  **Consistência de Cores**: Utilize as variáveis CSS (`bg-primary`, etc.) e nunca códigos hexadecimais puros.
