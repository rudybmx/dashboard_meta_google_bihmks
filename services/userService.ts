import { supabase } from './supabaseClient';
import { UserProfile, UserFormData } from '../types';

const TABLE_USERS = 'perfil_acesso';

export const fetchUsers = async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
        .from(TABLE_USERS)
        .select('id, email, name:nome, role, assigned_franchise_ids, assigned_account_ids, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data as unknown as UserProfile[];
};

export const createUser = async (userData: UserFormData): Promise<UserProfile | null> => {
    console.log("DEBUG: Using RPC for User Creation"); // Force HMR & Debug
    // Call the Secure RPC that handles Auth + Profile creation atomically
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_platform_user', {
        p_email: userData.email,
        p_password: userData.password || 'Mudar123!', 
        p_name: userData.name,
        p_role: userData.role,
        p_franchise_ids: userData.assigned_franchise_ids || [],
        p_account_ids: userData.assigned_account_ids || []
    });

    if (rpcError) {
        console.error("RPC Create User Failed:", rpcError);
        throw new Error(rpcError.message);
    }

    return {
        id: rpcData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        assigned_franchise_ids: userData.assigned_franchise_ids,
        assigned_account_ids: userData.assigned_account_ids,
        created_at: new Date().toISOString()
    } as UserProfile;
};

export const updateUser = async (id: string, updates: Partial<UserFormData>): Promise<UserProfile | null> => {
    // Map Frontend 'name' to DB 'nome'
    const payload: any = { ...updates };
    if (payload.name) {
        payload.nome = payload.name;
        delete payload.name;
    }
    delete payload.password; 
    delete payload.id;

    const { data, error } = await supabase
        .from(TABLE_USERS)
        .update(payload)
        .eq('id', id)
        .select('id, email, name:nome, role, assigned_franchise_ids, assigned_account_ids, created_at')
        .single();

    if (error) {
        console.error('Error updating user:', error);
        throw error;
    }
    return data as unknown as UserProfile;
};

export const deleteUser = async (id: string) => {
    console.log("DEBUG: Using RPC for User Deletion"); // Force HMR
    // Securely delete from Auth and Public tables via RPC
    const { error } = await supabase.rpc('delete_platform_user', {
        p_user_id: id
    });

    if (error) {
        console.error("Error deleting user (RPC):", error);
        throw error;
    }
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
    const { data, error } = await supabase.rpc('reset_platform_user_password', {
        p_user_id: userId,
        p_new_password: newPassword
    });

    if (error) {
        console.error("Falha ao redefinir senha (RPC):", error);
        throw new Error(error.message || "Falha ao redefinir senha.");
    }
    return data;
};
