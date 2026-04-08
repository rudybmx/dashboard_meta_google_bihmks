import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type UserPayload = {
  id?: string
  email?: string
  name?: string
  role?: string
  password?: string
  assigned_account_ids?: string[]
  assigned_cluster_ids?: string[]
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const normalizeUser = (row: Record<string, unknown>) => ({
  id: String(row.id ?? ''),
  email: String(row.email ?? ''),
  name: String(row.nome ?? ''),
  role: String(row.role ?? 'client'),
  assigned_account_ids: Array.isArray(row.assigned_account_ids) ? row.assigned_account_ids : [],
  assigned_cluster_ids: Array.isArray(row.assigned_cluster_ids) ? row.assigned_cluster_ids : [],
  created_at: row.created_at ?? null,
})

const syncAccountAccess = async (
  supabase: ReturnType<typeof createClient>,
  userEmail: string,
  accountIds: string[],
) => {
  const { error: deleteError } = await supabase
    .from('user_accounts_access')
    .delete()
    .eq('user_email', userEmail)

  if (deleteError) throw deleteError

  if (!accountIds.length) return

  const rows = accountIds.map((accountId) => ({
    user_email: userEmail,
    account_id: accountId,
  }))

  const { error: insertError } = await supabase
    .from('user_accounts_access')
    .insert(rows)

  if (insertError) throw insertError
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return json(500, { error: 'Supabase environment not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const body = await req.json()
    const operation = String(body?.operation ?? '')
    const payload = (body?.payload ?? {}) as UserPayload

    if (operation === 'list') {
      const { data, error } = await supabase
        .from('perfil_acesso')
        .select('id, email, nome, role, assigned_account_ids, assigned_cluster_ids, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      return json(200, { users: (data ?? []).map(normalizeUser) })
    }

    if (operation === 'create') {
      if (!payload.email || !payload.name || !payload.password) {
        return json(400, { error: 'Missing required fields for create' })
      }

      const insertPayload = {
        email: payload.email,
        nome: payload.name,
        role: payload.role ?? 'client',
        password: payload.password,
        assigned_account_ids: payload.assigned_account_ids ?? [],
        assigned_cluster_ids: payload.assigned_cluster_ids ?? [],
      }

      const { data, error } = await supabase
        .from('perfil_acesso')
        .insert(insertPayload)
        .select('id, email, nome, role, assigned_account_ids, assigned_cluster_ids, created_at')
        .single()

      if (error) throw error

      await syncAccountAccess(
        supabase,
        data.email,
        Array.isArray(data.assigned_account_ids) ? data.assigned_account_ids : [],
      )

      return json(200, { user: normalizeUser(data) })
    }

    if (operation === 'update') {
      if (!payload.id) {
        return json(400, { error: 'Missing user id for update' })
      }

      const updatePayload = {
        nome: payload.name,
        role: payload.role,
        assigned_account_ids: payload.assigned_account_ids ?? [],
        assigned_cluster_ids: payload.assigned_cluster_ids ?? [],
      }

      const { data, error } = await supabase
        .from('perfil_acesso')
        .update(updatePayload)
        .eq('id', payload.id)
        .select('id, email, nome, role, assigned_account_ids, assigned_cluster_ids, created_at')
        .single()

      if (error) throw error

      await syncAccountAccess(
        supabase,
        data.email,
        Array.isArray(data.assigned_account_ids) ? data.assigned_account_ids : [],
      )

      return json(200, { user: normalizeUser(data) })
    }

    if (operation === 'delete') {
      if (!payload.id) {
        return json(400, { error: 'Missing user id for delete' })
      }

      const { data: userData, error: userError } = await supabase
        .from('perfil_acesso')
        .select('email')
        .eq('id', payload.id)
        .single()

      if (userError) throw userError

      const { error } = await supabase
        .from('perfil_acesso')
        .delete()
        .eq('id', payload.id)

      if (error) throw error

      if (userData?.email) {
        await syncAccountAccess(supabase, userData.email, [])
      }

      return json(200, { success: true })
    }

    if (operation === 'reset_password') {
      if (!payload.id || !payload.password) {
        return json(400, { error: 'Missing user id or password for reset' })
      }

      const { error } = await supabase
        .from('perfil_acesso')
        .update({ password: payload.password })
        .eq('id', payload.id)

      if (error) throw error

      return json(200, { success: true })
    }

    return json(400, { error: `Invalid operation: ${operation}` })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json(500, { error: message })
  }
})
