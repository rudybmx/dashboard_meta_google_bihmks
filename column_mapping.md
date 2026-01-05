# Mapeamento de Colunas - Meta Ads Data

Abaixo o mapeamento das colunas padrão da **Meta Graph API** utilizadas neste projeto.

## 📍 Identificação e Estrutura

* **`franqueado`**: Nome da unidade ou franqueado responsável pela conta (Dado interno do negócio).
* **`unique_id`**: Chave primária composta (geralmente `ad_id` + `data`) para garantir unicidade no banco de dados.
* **`account_id`**: ID numérico único da Conta de Anúncios na Meta.
* **`account_name`**: Nome de exibição da Conta de Anúncios.
* **`ad_id`**: ID numérico único do Anúncio (nível mais granular).
* **`date_start`**: Data de referência da métrica (formato YYYY-MM-DD).
* **`campaign_name`**: Nome da Campanha (Nível 1 - Objetivo macro).
* **`adset_name`**: Nome do Conjunto de Anúncios (Nível 2 - Segmentação e Orçamento).
* **`ad_name`**: Nome do Anúncio (Nível 3 - Criativo).
* **`objective`**: Objetivo de otimização configurado na campanha (ex: `OUTCOME_LEADS`, `OUTCOME_TRAFFIC`).

## 💰 Métricas de Custo e Eficiência

* **`valor_gasto`**: Valor total investido na moeda da conta no período (Amount Spent).
* **`cpc`**: Custo Médio por Clique (Cost Per Click - All). *Cálculo: Gasto / Cliques*.
* **`ctr`**: Taxa de Cliques (Click Through Rate - All). *Cálculo: (Cliques / Impressões) * 100*.
* **`cpm`**: Custo por Mil Impressões. Indica a "inflação" do leilão.
* **`frequencia`**: Média de vezes que o anúncio foi exibido para a mesma pessoa. *Cálculo: Impressões / Alcance*.
* **`custo_por_lead`**: Custo médio por cadastro (CPL).
* **`custo_por_compra`**: Custo médio por aquisição/venda (CPA).

## 📊 Métricas de Volume (Fundo de Funil)

* **`impressoes`**: Quantidade de vezes que o anúncio apareceu na tela.
* **`cliques_todos`**: Total de cliques em qualquer área do anúncio (link, perfil, reação, expansão).
* **`compras`**: Quantidade total de eventos de conversão "Purchase" registrados pelo Pixel/API.
* **`leads_total`**: Quantidade total de eventos de cadastro (On-Facebook Leads ou Site Leads).
* **`msgs_iniciadas`**: Quantidade de conversas iniciadas em apps de mensagem (WhatsApp/Messenger/Direct).
* **`msgs_conexoes`**: Conexões de mensagem confirmadas (quando o usuário envia a primeira mensagem).
* **`msgs_novos_contatos`**: Novos contatos de mensagem (excluindo pessoas que já interagiram antes).
* **`msgs_profundidade_2`**: Métricas personalizadas de funil de chat (ex: enviou segunda mensagem ou avançou no bot).
* **`msgs_profundidade_3`**: Métricas personalizadas de funil de chat (etapa avançada).

## 🎯 Segmentação (Targeting)

* **`target_interesses`**: Lista de interesses selecionados no conjunto de anúncios (Detailed Targeting).
* **`target_familia`**: Status de segmentação familiar ou demográfica específica.
* **`target_comportamentos`**: Segmentação por comportamento digital (ex: "Viajantes frequentes", "Admins de páginas").
* **`target_publicos_custom`**: Uso de Públicos Personalizados (Lookalike, Lista de Clientes, Remarketing).
* **`target_local_1`**: Localização geográfica principal alvo do anúncio (Cidade/Estado).
* **`target_local_2`**: Coordenadas ou raio adicional de localização (Latitude).
* **`target_local_3`**: Coordenadas ou raio adicional de localização (Longitude).
* **`target_tipo_local`**: Tipo de segmentação geográfica (ex: "Pessoas que moram aqui", "Pessoas visitando").
* **`target_brand_safety`**: Filtros de inventário para segurança de marca.
* **`target_plataformas`**: Plataformas onde o anúncio rodou (facebook, instagram, audience_network).
* **`target_posicao_fb`**: Posicionamentos específicos no Facebook (feed, story, marketplace).
* **`target_posicao_ig`**: Posicionamentos específicos no Instagram (feed, story, reels).
* **`target_idade_min`**: Idade mínima do público alvo.
* **`target_idade_max`**: Idade máxima do público alvo.

## 🎨 Criativo (Ads Creative)

* **`ad_image_url`**: Link direto da imagem ou thumbnail do vídeo usado no anúncio.
* **`ad_title`**: Título principal do anúncio (Headline).
* **`ad_body`**: Texto principal do anúncio (Primary Text / Copy).
* **`ad_destination_url`**: URL final para onde o usuário é direcionado.
* **`ad_cta`**: Botão de chamada para ação escolhido (ex: "Saiba Mais", "Fale Conosco").
* **`ad_post_link`**: Link permalink para visualizar o anúncio publicado nativamente (Preview Link).