import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../services/supabaseService';
import { UserProfile, UserRole } from './types';

export interface AuthContextType {
    session: Session | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ========== FUNÇÃO ÚNICA DE INICIALIZAÇÃO ==========
    const initializeAuth = useCallback(async () => {
        let isMounted = true;

        try {
            setLoading(true);
            setError(null);

            console.log('[Auth] Iniciando verificação de sessão...');

            // 1. Buscar sessão com timeout de 3 segundos
            let currentSession: Session | null = null;

            try {
                const getSessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 3000)
                );

                const result = await Promise.race([getSessionPromise, timeoutPromise]);

                if (result.error) {
                    throw result.error;
                }

                currentSession = result.data.session;
            } catch (err: any) {
                if (err.message === 'Session check timeout') {
                    console.warn('[Auth] Timeout ao buscar sessão');
                    if (isMounted) {
                        setError('Conexão lenta. Tente novamente.');
                        setLoading(false);
                    }
                    return;
                }

                // Refresh token inválido/expirado
                if (
                    err.message?.includes('Invalid Refresh Token') ||
                    err.message?.includes('Refresh Token Not Found')
                ) {
                    console.warn('[Auth] Token expirado. Limpando...');
                    await supabase.auth.signOut();
                    localStorage.clear();
                    if (isMounted) {
                        setSession(null);
                        setUserProfile(null);
                        setLoading(false);
                    }
                    return;
                }

                throw err;
            }

            // 2. Se não há sessão, parar aqui
            if (!currentSession?.user?.email) {
                console.log('[Auth] Nenhuma sessão ativa');
                if (isMounted) {
                    setSession(null);
                    setUserProfile(null);
                    setLoading(false);
                }
                return;
            }

            // 3. Sessão existe - buscar perfil
            console.log('[Auth] Sessão encontrada:', currentSession.user.email);

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('perfil_acesso')
                    .select('*')
                    .eq('email', currentSession.user.email)
                    .maybeSingle();

                if (profileError) {
                    // Check for common Supabase/PostgREST schema or connection errors
                    if (profileError.code === 'PGRST116') {
                        // This is "no rows returned", which is expected if maybeSingle is used and no row exists
                        // But we already handle !profileData below.
                    } else if (profileError.message?.includes('schema') || profileError.code?.startsWith('42') || profileError.code?.startsWith('P0')) {
                        console.error('[Auth] Erro de Schema/Estrutura detectado:', profileError);
                        if (isMounted) {
                            setError('Erro interno de banco de dados (Schema). Por favor, execute o script de correção no painel do Supabase.');
                        }
                        return;
                    } else {
                        throw profileError;
                    }
                }

                if (!profileData) {
                    console.error('[Auth] Perfil não encontrado no banco de dados para:', currentSession.user.email);
                    if (isMounted) {
                        setError('Seu perfil de usuário não foi encontrado. Se você acabou de criar a conta, aguarde alguns segundos ou verifique se o administrador executou o script de permissões.');
                        // Deslogar usuário sem perfil para evitar loop de carregamento
                        await supabase.auth.signOut();
                        setSession(null);
                        setUserProfile(null);
                    }
                    return;
                }

                // Perfil encontrado
                const pData = profileData as any;
                const profile: UserProfile = {
                    id: pData.id || currentSession.user.id,
                    email: pData.email || currentSession.user.email,
                    name: pData.nome || currentSession.user.email?.split('@')[0] || 'Usuário',
                    role: (pData.role as UserRole) || 'client',
                    // DB uses native text[], so no parsing needed. Fallback to empty array.
                    assigned_franchise_ids: pData.assigned_franchise_ids || [],
                    assigned_account_ids: pData.assigned_account_ids || [],
                    permissions: pData.permissions,
                    created_at: pData.created_at,
                };

                console.log('[Auth] Perfil processado:', {
                    email: profile.email,
                    role: profile.role,
                    franchises: profile.assigned_franchise_ids
                });

                if (isMounted) {
                    setSession(currentSession);
                    setUserProfile(profile);
                    console.log('[Auth] ✅ Autenticação completa:', profile.email);
                }
            } catch (profileErr: any) {
                console.error('[Auth] Erro ao buscar perfil:', profileErr);
                if (isMounted) {
                    setError('Erro ao buscar informações do usuário. Tente novamente.');
                    await supabase.auth.signOut();
                    setSession(null);
                    setUserProfile(null);
                }
            }
        } catch (err: any) {
            console.error('[Auth] Erro crítico:', err);
            if (isMounted) {
                setError(err.message || 'Erro de autenticação');
                await supabase.auth.signOut();
                setSession(null);
                setUserProfile(null);
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    }, []);

    // ========== EFEITO ÚNICO: Executar uma vez no mount ==========
    useEffect(() => {
        let isMounted = true;

        // Inicializar autenticação
        initializeAuth();

        // Registrar listener para mudanças
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!isMounted) return;

                console.log('[Auth] Evento:', event);

                // Ignorar evento inicial (já tratado por initializeAuth)
                if (event === 'INITIAL_SESSION') {
                    console.log('[Auth] Ignorando INITIAL_SESSION (já processado)');
                    return;
                }

                // Logout
                if (event === 'SIGNED_OUT') {
                    console.log('[Auth] Usuário deslogado');
                    setSession(null);
                    setUserProfile(null);
                    setLoading(false);
                    return;
                }

                // Login ou refresh bem-sucedido
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    console.log('[Auth] Atualizando sessão após evento:', event);
                    setSession(newSession);
                    // Re-executar inicialização para pegar perfil atualizado
                    if (newSession) {
                        initializeAuth();
                    } else {
                        setSession(null);
                        setUserProfile(null);
                        setLoading(false);
                    }
                    return;
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [initializeAuth]);

    // ========== FUNÇÕES EXPORTADAS ==========
    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setSession(null);
            setUserProfile(null);
            setError(null);
        } catch (err: any) {
            console.error('[Auth] Erro ao deslogar:', err);
            setError('Erro ao deslogar');
        }
    };

    const clearError = () => setError(null);

    // ========== VALOR DO CONTEXTO ==========
    const value: AuthContextType = {
        session,
        userProfile,
        loading,
        error,
        logout,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
