# 🗄️ Documentação do Banco de Dados - OP7 Performance

Este documento descreve o esquema de banco de dados necessário para replicar o ambiente do dashboard.

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

---

## 2. Tabelas de Configuração de Anúncios

### `tb_meta_ads_contas`

Configurações e visibilidade das contas de anúncios da Meta.

* **account_id**: Text (Primary Key - ID numérico da Meta)
* **nome_original**: Text
* **nome_ajustado**: Text (Apelido para o dashboard)
* **franqueado**: Text (Nome da franquia vinculada)
* **saldo_balanco**: Numeric (Saldo atual da conta)
* **client_visibility**: Boolean (Se aparece ou não no dashboard do cliente)
* **categoria_id**: UUID (Foreign Key para `tb_categorias_clientes`) [Novo]

### `tb_categorias_clientes` [Novo]

Define as metas e fases do funil por tipo de negócio.

* **id**: UUID (Primary Key)
* **nome_categoria**: Text
* **cpl_medio**: Numeric
* **fase1_nome**, **fase1_perc**: Text, Numeric
* **fase2_nome**, **fase2_perc**: Text, Numeric
* **fase3_nome**, **fase3_perc**: Text, Numeric
* **fase4_nome**, **fase4_perc**: Text, Numeric

---

## 3. Dados de Performance

### `ads_insights` (Tabela Base)

Dados brutos importados da API da Meta.

* **unique_id**: Text (Primary Key - Geralmente `ad_id + date`)
* **date_start**: Date
* **account_id**: Text
* **valor_gasto**: Numeric
* **impressoes**: BigInt
* **cliques_todos**: BigInt
* **leads_total**: BigInt
* **msgs_iniciadas**: BigInt
* **campaign_name**: Text
* **ad_image_url**: Text

### `vw_dashboard_unified` (View)

View que une os dados de performance com as informações das franquias para o frontend.

---

## 4. Funções RPC (SQL Functions)

Para o sistema funcionar, as seguintes funções devem estar criadas no "SQL Editor" do Supabase:

1. **`get_campaign_summary`**: Retorna os dados agregados para os gráficos principais.
* *Parâmetros*: `p_start_date`, `p_end_date`, `p_franchise_ids`, `p_account_ids`.


2. **`get_kpi_comparison`**: Calcula o MoM (Mês sobre Mês) comparando períodos.
3. **`get_managerial_data`**: Alimenta o Resumo Gerencial com dados consolidados.

---

## 🚀 Instruções para Duplicação

1. **Setup de Auth**: Configure o provedor de e-mail no Supabase Auth.
2. **Schema**: Execute o script SQL de criação das tabelas acima (solicite ao dev o arquivo `.sql`).
3. **Categorias**: Antes de importar dados, cadastre as categorias na nova aba de configurações.
4. **Vincular Contas**: Ao cadastrar novas `tb_meta_ads_contas`, garanta que o `account_id` seja o ID real da Meta para que os scripts de integração funcionem.
5. **Vercel/Environment**: Atualize as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no novo projeto.

---

**Dica para o Agente Dev:** "Ao duplicar, verifique se as políticas de RLS (Row Level Security) foram aplicadas para garantir que um franqueado não veja os dados de outro.".