import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseService';
import { UserProfile, UserRole, LocalSession } from './types';
import { logger } from '@/src/shared/lib/logger';

export interface AuthContextType {
    session: LocalSession | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'op7_local_session';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<LocalSession | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ========== CARREGAR SESSAO DO STORAGE ==========
    const loadSessionFromStorage = useCallback(async () => {
        let isMounted = true;
        try {
            setLoading(true);
            const stored = localStorage.getItem(STORAGE_KEY);

            if (!stored) {
                if (isMounted) setLoading(false);
                return;
            }

            const localSession = JSON.parse(stored) as LocalSession;

            // 1. Buscar perfil via RPC (contorna RLS na tabela perfil_acesso)
            const { data: profileData, error: profileError } = await (supabase.rpc as any)(
                'authenticate_user',
                { p_email: localSession.email, p_password: '' }
            );

            // authenticate_user com senha vazia pode retornar vazio — fallback: buscar só accounts
            // Se a RPC de accounts retornar dados, o usuário é válido
            const { data: accountsData, error: accountsError } = await (supabase.rpc as any)(
                'get_user_assigned_accounts',
                { p_user_email: localSession.email }
            );

            if (accountsError) {
                logger.error('Error fetching user accounts', accountsError);
            }

            // Se não conseguimos nem o perfil nem as contas, sessão inválida
            const hasProfile = profileData && (profileData as any[]).length > 0;
            const hasAccounts = accountsData && (accountsData as any[]).length > 0;

            if (!hasProfile && !hasAccounts) {
                logger.warn('Session invalid or user not found');
                localStorage.removeItem(STORAGE_KEY);
                if (isMounted) {
                    setSession(null);
                    setUserProfile(null);
                }
                return;
            }

            const assignedIds: string[] = accountsData
                ? (accountsData as any[]).map((a: any) =>
                    String(a.account_id).replace(/^act_/, ''))
                : [];

            // Usar dados do profileData se disponível, senão reconstruir da sessão
            const pData = hasProfile ? (profileData as any[])[0] : null;
            const profile: UserProfile = {
                id: pData?.id ?? localSession.userId,
                email: pData?.email ?? localSession.email,
                name: pData?.nome ?? localSession.email.split('@')[0],
                role: ((pData?.role ?? 'client') as UserRole),
                assigned_account_ids: assignedIds,
                permissions: pData?.permissions ?? [],
                created_at: pData?.created_at ?? localSession.createdAt,
            };

            if (isMounted) {
                setSession(localSession);
                setUserProfile(profile);
            }

        } catch (err) {
            logger.error('Error loading session:', err);
            localStorage.removeItem(STORAGE_KEY);
        } finally {
            if (isMounted) setLoading(false);
        }
    }, []);

    // ========== LOGIN INTERNO ==========
    const login = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await (supabase.rpc as any)('authenticate_user', {
                p_email: email,
                p_password: password
            });

            if (error) {
                console.error('Erro no login:', error);
                throw new Error('Erro ao processar login.');
            }

            if (!data || data.length === 0) {
                throw new Error('Credenciais inválidas.');
            }

            const pData = data[0];

            const { data: accountsData } = await (supabase.rpc as any)('get_user_assigned_accounts', {
                p_user_email: email
            });

            const assignedIds: string[] = accountsData
                ? (accountsData as any[]).map((a: any) =>
                    String(a.account_id).replace(/^act_/, ''))
                : [];

            const newSession: LocalSession = {
                userId: pData.id,
                email: pData.email,
                createdAt: new Date().toISOString()
            };

            const profile: UserProfile = {
                id: pData.id,
                email: pData.email,
                name: pData.nome || pData.email.split('@')[0],
                role: (pData.role as UserRole) || 'client',
                assigned_account_ids: assignedIds,
                permissions: pData.permissions || [],
                created_at: pData.created_at,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
            setSession(newSession);
            setUserProfile(profile);

        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // ========== LOGOUT ==========
    const logout = async () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            setSession(null);
            setUserProfile(null);
            setError(null);
        } catch (err) {
            logger.error('Error logout:', err);
        }
    };

    const clearError = () => setError(null);

    // ========== EFEITOS ==========
    useEffect(() => {
        loadSessionFromStorage();
    }, [loadSessionFromStorage]);

    const value: AuthContextType = useMemo(() => ({
        session,
        userProfile,
        loading,
        error,
        login,
        logout,
        clearError,
    }), [session, userProfile, loading, error]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
