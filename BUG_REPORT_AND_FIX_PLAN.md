# Bug Report & Fix Plan - Post Auth Refactor

## 📊 Problemas Identificados

### ❌ PROBLEMA 1: "Cannot coerce the result to a single JSON object"
**Severity**: 🔴 CRITICAL
**Location**: Tela de edição de usuário (UsersSettingsTab.tsx)
**When**: Ao salvar permissões de franqueados

**Causa Raiz**: 
O RPC ou função que atualiza `assigned_franchise_ids` está retornando um **array ou múltiplas linhas** quando o sistema espera um **único objeto JSON**.

**Exemplo do erro**:
```typescript
// ❌ ERRADO - Retorna array
.select('assigned_franchise_ids') // Retorna: [1, 2, 3]

// ✅ CERTO - Retorna um único objeto
.select('*').single() // Retorna: { id: 1, assigned_franchise_ids: [1,2,3], ... }
```

---

### ❌ PROBLEMA 2: Filtros não aparecem corretamente para Multi-Franqueado
**Severity**: 🟠 HIGH
**Location**: DashboardHeader.tsx, App.tsx
**When**: Usuário multi-franqueado loga e acessa o dashboard

**Causa Raiz**:
O `userProfile.assigned_franchise_ids` está vindo do banco de dados como:
- **Array**: `[1, 2, 3]` ✅
- **String JSON**: `"[1,2,3]"` ❌
- **NULL/undefined**: `null` ❌

Quando chega **string JSON**, o filtro não encontra as franqueadas porque compara:
```typescript
// ❌ Não funciona
if (userProfile.assigned_franchise_ids.includes('OP7 | GOIÂNIA')) 
// ↑ undefined.includes() → erro!

// ✅ Funcionaria
if (typeof assigned_franchise_ids === 'string') {
  assigned_franchise_ids = JSON.parse(assigned_franchise_ids)
}
```

---

### ❌ PROBLEMA 3: Console errors (GET request timeout)
**Severity**: 🟡 MEDIUM
**Location**: Network tab
**When**: Carregamento do dashboard

**Logs**:
```
GET https://scontent-mrs2-1.xx...
net::ERR_CONNECTION_TIMED_OUT
```

**Causa Raiz**:
Tentativa de carregar assets do Instagram/Meta (provavelmente imagens de criativos).
Isso pode ser:
1. URL inválida ou quebrada
2. CORS bloqueado
3. Rate limit do CDN

---

## 🔧 Plano de Fix (Prioridade)

### PASSO 1: Fix CRÍTICO - "Cannot coerce" Error (30 min)

**Arquivo**: `src/services/supabaseService.ts`

Encontre a função que atualiza user permissions:

```typescript
❌ ANTES (ERRADO):
export const updateUserPermissions = async (userId, franchises) => {
  const { data, error } = await supabase
    .from('perfil_acesso')
    .update({ assigned_franchise_ids: franchises })
    .eq('id', userId)
    .select('assigned_franchise_ids') // ← PROBLEMA: pode retornar array
    .single();
    
  if (error) throw error;
  return data;
};

✅ DEPOIS (CORRETO):
export const updateUserPermissions = async (userId, franchises) => {
  const { data, error } = await supabase
    .from('perfil_acesso')
    .update({ 
      assigned_franchise_ids: franchises
    })
    .eq('id', userId)
    .select('*') // ← Retorna TODAS as colunas do usuário
    .single(); // ← Garante resultado único
    
  if (error) throw error;
  return data;
};
```

**Ou alternativa melhor (RPC)**:

```typescript
✅ MELHOR - Usar RPC dedicada:
export const updateUserPermissions = async (userId, franchises) => {
  const { data, error } = await supabase
    .rpc('update_user_franchises', {
      p_user_id: userId,
      p_franchises: franchises
    });
    
  if (error) throw error;
  return data;
};
```

**SQL da RPC** (criar no Supabase):
```sql
CREATE OR REPLACE FUNCTION update_user_franchises(
  p_user_id UUID,
  p_franchises TEXT[]
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  UPDATE perfil_acesso
  SET assigned_franchise_ids = p_franchises
  WHERE id = p_user_id;
  
  SELECT json_build_object(
    'id', id,
    'email', email,
    'assigned_franchise_ids', assigned_franchise_ids,
    'role', role
  ) INTO v_result
  FROM perfil_acesso
  WHERE id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### PASSO 2: Fix HIGH - Filtros não aparecem (45 min)

**Arquivo**: `src/auth/AuthProvider.tsx`

Adicionar **parsing seguro** do assigned_franchise_ids:

```typescript
❌ ANTES:
const profile: UserProfile = {
  id: profileData.id || currentSession.user.id,
  email: profileData.email || currentSession.user.email,
  name: profileData.nome || currentSession.user.email?.split('@')[0] || 'Usuário',
  role: profileData.role || 'client',
  assigned_franchise_ids: profileData.assigned_franchise_ids || [], // ← PROBLEMA
  assigned_account_ids: profileData.assigned_account_ids || [],
  permissions: profileData.permissions,
  created_at: profileData.created_at,
};

✅ DEPOIS (com parsing seguro):
// Helper function
const parseArrayField = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const profile: UserProfile = {
  id: profileData.id || currentSession.user.id,
  email: profileData.email || currentSession.user.email,
  name: profileData.nome || currentSession.user.email?.split('@')[0] || 'Usuário',
  role: profileData.role || 'client',
  assigned_franchise_ids: parseArrayField(profileData.assigned_franchise_ids), // ✅
  assigned_account_ids: parseArrayField(profileData.assigned_account_ids), // ✅
  permissions: profileData.permissions,
  created_at: profileData.created_at,
};

console.log('[Auth] Parsed franchises:', profile.assigned_franchise_ids);
```

**Arquivo**: `src/App.tsx`

Na função `availableFranchises`, adicionar validação:

```typescript
❌ ANTES:
const availableFranchises = useMemo(() => {
  if (!userProfile) return [];

  if (userProfile.role === 'admin' || userProfile.role === 'executive') {
    return officialFranchises;
  }

  if (userProfile.role === 'client') {
    return [];
  }

  const assignedIds = userProfile.assigned_franchise_ids || []; // ← PODE SER NULL
  return officialFranchises.filter((f) => assignedIds.includes(f.name));
}, [userProfile, officialFranchises]);

✅ DEPOIS:
const availableFranchises = useMemo(() => {
  if (!userProfile) return [];

  if (userProfile.role === 'admin' || userProfile.role === 'executive') {
    return officialFranchises;
  }

  if (userProfile.role === 'client') {
    return [];
  }

  // Garantir que assigned_franchise_ids é sempre um array
  const assignedIds = Array.isArray(userProfile.assigned_franchise_ids) 
    ? userProfile.assigned_franchise_ids 
    : [];

  console.log('[Filter] Role:', userProfile.role);
  console.log('[Filter] Assigned IDs:', assignedIds);
  console.log('[Filter] Official Franchises:', officialFranchises);

  const filtered = officialFranchises.filter((f) => assignedIds.includes(f.name));
  
  console.log('[Filter] Result:', filtered);
  return filtered;
}, [userProfile, officialFranchises]);
```

---

### PASSO 3: Fix MEDIUM - Console errors (15 min)

**Arquivo**: `src/components/CreativesView.tsx` ou onde carrega imagens

Adicionar error handling:

```typescript
❌ ANTES:
<img src={data.creative_url} alt="Creative" />

✅ DEPOIS:
<img 
  src={data.creative_url} 
  alt="Creative"
  onError={(e) => {
    console.warn('[Creative] Failed to load:', data.creative_url);
    e.currentTarget.src = '/placeholder-creative.png';
  }}
/>
```

**Ou usar fallback:**

```typescript
const getCreativeUrl = (url: string) => {
  if (!url || url.includes('instagram') || url.includes('meta')) {
    return '/placeholder-creative.png';
  }
  return url;
};
```

---

## 📋 Checklist de Implementação

### Priority 1 (CRÍTICO - Fix hoje)
- [ ] Atualizar função `updateUserPermissions` em supabaseService.ts
  - [ ] Mudar `.select('assigned_franchise_ids')` para `.select('*')`
  - [ ] Testar saving usuário
  - [ ] Confirmar que erro some

### Priority 2 (ALTO - Fix hoje)
- [ ] Adicionar `parseArrayField()` em AuthProvider.tsx
- [ ] Aplicar em `assigned_franchise_ids` e `assigned_account_ids`
- [ ] Adicionar logs de debug em `availableFranchises`
- [ ] Login com usuário multi-franqueado
- [ ] Verificar filtros aparecem corretamente

### Priority 3 (MÉDIO - Fix amanhã)
- [ ] Adicionar `onError` em componentes que carregam imagens
- [ ] Criar placeholder para criativos
- [ ] Verificar que console não tem mais erros 404

---

## 🧪 Testes Pós-Fix

**TESTE 1: Save User Permissions**
```
1. Vá para Configurações → Usuários
2. Edite um usuário
3. Altere as franqueadas selecionadas
4. Clique "Salvar Alterações"
5. ✅ ESPERADO: Modal fecha, sem erro "Cannot coerce"
6. ❌ NÃO ESPERADO: Erro vermelho, modal fica aberta
```

**TESTE 2: Multi-Franqueado Filters**
```
1. Logout do usuário atual
2. Login com usuario multi-franqueado (ex: rodrigo@op7.com)
3. Vá para Dashboard
4. ✅ ESPERADO: 
   - Dropdown "Selecionar Franqueada" aparece
   - Mostra apenas franqueadas atribuídas (ex: OP7 | GOIÂNIA, OP7 | BRASÍLIA)
5. ❌ NÃO ESPERADO:
   - Dropdown desaparece
   - Todas as franqueadas aparecem
   - Filtro não funciona
```

**TESTE 3: Console Clean**
```
1. Abra DevTools (F12)
2. Recarregue dashboard
3. ✅ ESPERADO: 
   - Nenhum erro GET net::ERR_CONNECTION_TIMED_OUT
   - Logs [Auth] e [Filter] aparecem normalmente
4. ❌ NÃO ESPERADO:
   - Erros 404 ou timeout
   - Muitos avisos de Network
```

---

## 🔍 Debug Commands (se precisar)

No console do navegador:

```javascript
// Ver perfil completo do usuário logado
console.log(JSON.stringify(localStorage.getItem('auth.session'), null, 2))

// Ver assigned_franchise_ids com tipo
const profile = /* seu userProfile */;
console.log('Type:', typeof profile.assigned_franchise_ids);
console.log('Value:', profile.assigned_franchise_ids);
console.log('Is Array?', Array.isArray(profile.assigned_franchise_ids));

// Simular parsing
const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};
console.log('Parsed:', parseArrayField(profile.assigned_franchise_ids));
```

---

## 📝 Resumo

| Problema | Causa | Fix | Tempo |
|----------|-------|-----|-------|
| "Cannot coerce" | `.select()` retorna array | Usar `.select('*').single()` | 10 min |
| Filtros não aparecem | assigned_franchise_ids é string JSON | Adicionar `parseArrayField()` | 15 min |
| Console errors | URLs quebradas de imagem | Adicionar `onError` fallback | 10 min |

**Tempo total**: ~35 minutos
**Dificuldade**: Baixa
**Impacto**: Alto (resolve 3 bugs críticos)

---

## ⏭️ Próximas Ações

1. **Agora**: Seu agente implementa os 3 fixes
2. **Depois**: Execute os 3 testes
3. **Se passar**: Commit + Push
4. **Se falhar**: Me envia screenshot dos logs

Qualquer dúvida, me chama! 🚀
