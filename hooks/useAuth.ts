import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { UserProfile } from '../types';

export const useAuth = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function getUser() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session?.user) {
                    if (mounted) setUser(null);
                    return;
                }

                // Fetch Profile details from user_profiles table
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error("Erro ao buscar perfil:", error);
                    // Fallback se não tiver perfil criado ainda, assume 'franqueado' ou similar para segurança
                    // Mas idealmente o perfil deve existir.
                }

                if (mounted && profile) {
                     // Cast manual necessário pois user_profiles do DB retorna strings e Arrays
                     // e precisamos garantir compatibilidade com UserProfile
                     setUser({
                        id: profile.id,
                        email: profile.email,
                        name: profile.name || session.user.email || 'Usuário',
                        role: (profile.role as any) || 'franqueado',
                        assigned_franchise_ids: profile.assigned_franchise_ids || [],
                        assigned_account_ids: profile.assigned_account_ids || [],
                        created_at: profile.created_at || new Date().toISOString()
                     });
                } else if (mounted && !profile) {
                     // Fallback temporário para super-admin inicial se tabela vazia
                     if (session.user.email === 'rudy@op7.com') {
                        setUser({
                            id: session.user.id,
                            email: session.user.email!,
                            name: 'Rudy Admin',
                            role: 'admin',
                            assigned_franchise_ids: [],
                            assigned_account_ids: [],
                            created_at: new Date().toISOString()
                        });
                     }
                }

            } catch (e) {
                console.error(e);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            getUser();
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        loading,
        isAdmin: user?.role === 'admin',
        isExecutive: user?.role === 'executive' || user?.role === 'admin',
        canManageUsers: user?.role === 'admin',
        isAuthenticated: !!user
    };
};
