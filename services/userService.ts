import { supabase } from './supabaseClient';
import { UserProfile, UserFormData } from '../types';

const USER_FUNCTION = 'manage-platform-users';

const invokeUserManager = async <T>(operation: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(USER_FUNCTION, {
    body: {
      operation,
      payload,
    },
  });

  if (error) {
    console.error(`Error invoking ${USER_FUNCTION}:`, error);
    throw new Error(error.message || 'Erro ao processar usuários.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
};

export const fetchUsers = async (): Promise<UserProfile[]> => {
  try {
    const response = await invokeUserManager<{ users: UserProfile[] }>('list');
    return response.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const createUser = async (userData: UserFormData): Promise<UserProfile | null> => {
  const response = await invokeUserManager<{ user: UserProfile }>('create', {
    email: userData.email,
    name: userData.name,
    role: userData.role,
    password: userData.password,
    assigned_account_ids: userData.assigned_account_ids || [],
    assigned_cluster_ids: userData.assigned_cluster_ids || [],
  });

  return response.user ?? null;
};

export const updateUser = async (id: string, updates: Partial<UserFormData>): Promise<UserProfile | null> => {
  const response = await invokeUserManager<{ user: UserProfile }>('update', {
    id,
    name: updates.name,
    role: updates.role,
    assigned_account_ids: updates.assigned_account_ids || [],
    assigned_cluster_ids: updates.assigned_cluster_ids || [],
  });

  return response.user ?? null;
};

export const deleteUser = async (id: string) => {
  await invokeUserManager('delete', { id });
};

export const resetUserPassword = async (userId: string, newPassword: string) => {
  await invokeUserManager('reset_password', { id: userId, password: newPassword });
  return true;
};
