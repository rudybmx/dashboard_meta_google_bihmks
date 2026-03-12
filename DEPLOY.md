# 🚀 Guia de Deploy - Bihmks.Gow Plataforma Dashboard

## 📋 Pré-requisitos

- Node.js 20+
- NPM ou Yarn
- Conta no Supabase (produção)
- Conta na plataforma de hospedagem (Netlify, Vercel, etc.)

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env.production` na raiz do projeto (não commitar!):

```env
# Supabase Production
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Gemini API (se necessário)
GEMINI_API_KEY=sua-chave-gemini

# Log Level (opcional)
VITE_LOG_LEVEL=error
```

## 🏗️ Build de Produção

```bash
# Instalar dependências
npm ci

# Executar testes
npm test

# Build de produção
npm run build
```

O build será gerado na pasta `dist/`.

## 🌐 Opções de Deploy

### Opção 1: Netlify (Recomendado)

1. Conecte seu repositório GitHub ao Netlify
2. Configure as variáveis de ambiente no painel do Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

**Configuração manual:**
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Opção 2: Vercel

1. Importe seu projeto no Vercel
2. Configure as variáveis de ambiente
3. Framework preset: Vite

**Configuração manual:**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Opção 3: GitHub Pages

1. Descomente a seção no arquivo `.github/workflows/deploy.yml`
2. Configure `GITHUB_TOKEN` nos secrets
3. Push para a branch `main`

### Opção 4: Supabase Storage (Static Hosting)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Deploy
supabase storage upload ./dist seu-bucket --recursive
```

## 🔒 Segurança

### Antes do Deploy

1. **Verificar se não há credenciais hardcoded**
   ```bash
   grep -r "sbp_" src/
   grep -r "eyJhbG" src/
   ```

2. **Confirmar que .env está no .gitignore**
   ```bash
   git check-ignore -v .env
   ```

3. **Verificar CSP (Content Security Policy)**
   - Já configurado em `index.html`
   - Ajuste conforme necessário para sua CDN

4. **Ativar RLS no Supabase**
   ```sql
   -- Verificar políticas RLS
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

## 📊 Monitoramento

### Logs

Em produção, logs são automaticamente suprimidos (exceto errors).
Para habilitar logs de debug temporariamente:

```javascript
// No console do navegador
localStorage.setItem('debug', 'true');
location.reload();
```

### Métricas Recomendadas

- Tempo de carregamento inicial (< 3s)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Taxa de erro de API

## 🔄 Rollback

Se necessário fazer rollback:

1. **GitHub Actions:** Re-executar workflow de deploy anterior
2. **Netlify/Vercel:** Usar função de "Deploy Previews" ou "Rollbacks"
3. **Manual:** Restaurar versão anterior do `dist/` do artifacts

## 🧪 Testes Pré-Deploy

Checklist antes de cada deploy:

- [ ] `npm test` passa todos os testes
- [ ] `npm run build` completa sem erros
- [ ] Verificar bundle size (< 2MB total)
- [ ] Testar em modo incógnito
- [ ] Verificar autenticação funciona
- [ ] Verificar dados carregam corretamente
- [ ] Testar em mobile (responsivo)

## 🆘 Troubleshooting

### "Failed to fetch" errors
- Verificar CORS no Supabase
- Confirmar URL do Supabase está correta

### Blank page após deploy
- Verificar CSP headers
- Verificar se todos os assets foram carregados (404 errors)
- Verificar console por erros de JS

### Cache antigo
- Limpar cache do service worker: DevTools > Application > Clear storage
- Incrementar versão no `vite.config.ts` para forçar refresh

### Autenticação não persiste
- Verificar se `localStorage` está disponível
- Verificar cookies de terceiros não estão bloqueados

## 📞 Suporte

Em caso de problemas:
1. Verificar logs no console do navegador
2. Verificar logs no dashboard do Supabase
3. Verificar build artifacts no GitHub Actions
4. Consultar documentação do Vite: https://vitejs.dev/guide/troubleshooting.html
