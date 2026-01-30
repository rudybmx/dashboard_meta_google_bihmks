# 🗄️ Documentação do Banco de Dados - OP7 Performance

Este documento descreve o esquema de banco de dados necessário para replicar o ambiente do dashboard. Atualizado com base na estrutura de produção em 29/01/2026.

## 1. Tabelas de Estrutura e Acesso

### `tb_franqueados`

Armazena as unidades de franquia do sistema.

* **id**: UUID (Primary Key)
* **nome**: Text (Nome da unidade, ex: "OP7 | GOIÂNIA")
* **ativo**: Boolean (Default: true)

### `perfil_acesso`

Gerencia os usuários e suas permissões de visualização.

* **id**: UUID (Relacionado ao Auth do Supabase)
* **email**: Text (Único)
* **nome**: Text
* **role**: Text (Valores: 'admin', 'executive', 'client')
* **assigned_franchise_ids**: UUID[] (Array nativo de IDs da tabela `tb_franqueados`)
* **assigned_account_ids**: Text[] (Array de IDs das contas da Meta)
* **created_at**: Timestamptz

---

## 2. Tabelas de Configuração de Anúncios

### `tb_meta_ads_contas`

Configurações, status e visibilidade das contas de anúncios da Meta. Esta tabela é central para o funcionamento do dashboard.

* **account_id**: Text (Primary Key - ID numérico da Meta convertido para Texto)
* **nome_original**: Text (Nome vindo da API da Meta)
* **nome_ajustado**: Text (Apelido definido para o dashboard)
* **franqueado**: Text (Nome da franquia vinculada - Legado, prefira usar `franqueado_id`)
* **franqueado_id**: UUID (Foreign Key para `tb_franqueados` - Vínculo real)
* **status_meta**: Text (Status retornado pela API: ex: 1, 2, 'ACTIVE')
* **status_interno**: Text (Status de controle do dashboard)
* **eh_pre_pago**: Text (Indica se a conta é pré-paga)
* **motivo_bloqueio**: Text (Detalhes se a conta estiver suspensa)
* **moeda**: Text (Currency code, ex: 'BRL')
* **saldo_balanco**: Text (Saldo atual da conta - Atenção: Armazenado como Texto no banco)
* **limite_gastos**: Text (Limite configurado na plataforma)
* **total_gasto**: Text (Total gasto acumulado)
* **client_visibility**: Boolean (Se aparece ou não no dashboard do cliente)
* **categoria_id**: UUID (Foreign Key para `tb_categorias_clientes`)
* **account_id_link**: BigInt (ID numérico auxiliar para links)
* **updated_at**: Timestamptz

### `tb_categorias_clientes`

Define as metas e fases do funil por tipo de negócio.

* **id**: UUID (Primary Key)
* **nome_categoria**: Text
* **cpl_medio**: Numeric
* **fase1_nome**, **fase1_perc**: Text, Numeric
* **fase2_nome**, **fase2_perc**: Text, Numeric
* **fase3_nome**, **fase3_perc**: Text, Numeric
* **fase4_nome**, **fase4_perc**: Text, Numeric
* **created_at**: Timestamptz

---

## 3. Dados de Performance

### `ads_insights` (Tabela Base)

Dados brutos importados da API da Meta.

* **unique_id**: Text (Primary Key - Geralmente `ad_id + date`)
* **date_start**: Date
* **account_id**: BigInt (Atenção: Armazenado como BigInt aqui, diferente da config que é Text)
* **account_name**: Text
* **franqueado**: Character Varying
* **ad_id**: BigInt
* **campaign_name**: Text
* **ad_name**: Text
* **ad_image_url**: Text
* **valor_gasto**: Numeric
* **impressoes**: BigInt
* **cliques_todos**: BigInt
* **leads_total**: BigInt
* **msgs_iniciadas**: BigInt
* **alcance**: BigInt
* **compras**: BigInt
* **freq**: Numeric
* **cpm**: Numeric
* **cpc**: Numeric
* **ctr**: Numeric
* **cpl**: Numeric
* **cpa**: Numeric

### `vw_dashboard_unified` (View Principal)

View que une os dados de performance com as informações das franquias para o frontend. Essencial para os gráficos funcionarem.

---

## 4. Funções RPC (SQL Functions)

Para o sistema funcionar, as seguintes funções devem estar criadas no "SQL Editor" do Supabase:

1. **`get_campaign_summary`**: Retorna os dados agregados para os gráficos principais.
2. **`get_kpi_comparison`**: Calcula o MoM (Mês sobre Mês) comparando períodos.
3. **`get_managerial_data`**: Alimenta o Resumo Gerencial com dados consolidados.

---

## 🚀 Instruções para Duplicação

1. **Setup de Auth**: Configure o provedor de e-mail no Supabase Auth.
2. **Schema**: 
    - Crie as tabelas `tb_franqueados` e `tb_categorias_clientes` primeiro.
    - Crie `tb_meta_ads_contas` cuidando para incluir o campo `franqueado_id` como FK.
    - Crie `ads_insights` respeitando os tipos numéricos/texto exatos listados acima.
3. **Categorias**: Antes de importar dados, cadastre as categorias na nova aba de configurações.
4. **Vincular Contas**: Ao cadastrar novas `tb_meta_ads_contas`, garanta que o `account_id` seja o ID real da Meta e faça o vínculo correto com o `franqueado_id`.
5. **Vercel/Environment**: Atualize as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no novo projeto.

**Dica de Segurança:** Não esqueça de habilitar RLS (Row Level Security) em todas as tabelas e criar políticas que usem a tabela `perfil_acesso` para filtrar o que cada usuário pode ver.