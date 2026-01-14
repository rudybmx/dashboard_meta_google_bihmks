import { supabase } from './supabaseClient';
import { UserProfile, UserFormData } from '../types';

const TABLE_USERS = 'user_profiles';

export const fetchUsers = async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from(TABLE_USERS)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data as unknown as UserProfile[];
};

export const createUser = async (userData: UserFormData): Promise<UserProfile | null> => {
    // 1. Tenta criar o Usuário no Auth (Se tiver permissão de Admin/Service Role)
    // Nota: Num ambiente client-side puro com Anon Key, isso falhará ou exigirá que o admin faça logout.
    // A solução ideal é uma Edge Function. Aqui faremos uma tentativa "Best Effort".
    
    let authId = null;

    if (userData.password) {
        // Tentativa de criar via Admin API (funciona se a chave for service_role, o que é inseguro no front, mas comum em dev local)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: { name: userData.name }
        });

        if (!authError && authData.user) {
            authId = authData.user.id;
        } else {
             console.warn("FALHA AO CRIAR AUTH USER (Provavelmente falta de permissão Admin):", authError);
             alert("Atenção: O usuário foi criado apenas no banco de dados (Perfil). Para que ele faça login, você deve criar manualmente no Authentication do Supabase com o mesmo email.");
        }
    }

    // 2. Cria o Perfil Público
    const profilePayload = {
        id: authId, // Se conseguiu criar no Auth, usa o mesmo ID. Se não, o banco gera um novo (mas login não funcionará auto)
        name: userData.name,
        email: userData.email,
        role: userData.role,
        assigned_franchise_ids: userData.assigned_franchise_ids,
        assigned_account_ids: userData.assigned_account_ids
    };

    // Remove ID undefined se falhou
    if (!profilePayload.id) delete profilePayload.id;

    const { data, error } = await supabase
        .from(TABLE_USERS)
        .insert([profilePayload])
        .select()
        .single();

    if (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
    return data as unknown as UserProfile;
};

export const updateUser = async (id: string, updates: Partial<UserFormData>): Promise<UserProfile | null> => {
    const payload: any = { ...updates };
    delete payload.password; 
    delete payload.id;

    const { data, error } = await supabase
        .from(TABLE_USERS)
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating user:', error);
        throw error;
    }
    return data as unknown as UserProfile;
};

export const deleteUser = async (id: string) => {
    // Tenta deletar do Auth também (Best Effort)
    await supabase.auth.admin.deleteUser(id).catch(err => console.warn("Não foi possível deletar do Auth:", err));

    const { error } = await supabase
        .from(TABLE_USERS)
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
    // Requer Service Role ou Edge Function
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
    });

    if (error) {
        console.error("Falha ao redefinir senha:", error);
        throw new Error("Não foi possível alterar a senha. Verifique se você tem permissões de Administrador (Service Role).");
    }
    return data;
};
