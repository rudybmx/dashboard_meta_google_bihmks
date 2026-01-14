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
    // Cast manual pois a tabela foi criada recentemente e os tipos auto-gerados ainda não a possuem
    return data as unknown as UserProfile[];
};

export const createUser = async (userData: UserFormData): Promise<UserProfile | null> => {
    // NOTE: In a real scenario, we would create the user in Supabase Auth first.
    // Since client-side creation logs out the current user, we are mocking this step
    // by creating the profile directly. In prod, use an Edge Function.
    
    const profilePayload = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        assigned_franchise_ids: userData.assigned_franchise_ids,
        assigned_account_ids: userData.assigned_account_ids
    };

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
    delete payload.password; // Never update password here
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
    const { error } = await supabase
        .from(TABLE_USERS)
        .delete()
        .eq('id', id);

    if (error) throw error;
};
