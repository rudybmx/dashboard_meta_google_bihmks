export type UserRole = 'admin' | 'executive' | 'franqueado' | 'multifranqueado' | 'client';

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    assigned_franchise_ids?: string[];
    assigned_account_ids?: string[];
    permissions?: Record<string, any>;
    created_at?: string;
}
