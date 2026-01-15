import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, fetchUserProfile } from '../services/supabaseService';
import { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    userProfile: any | null; // Typed loosely as 'any' for now to match App.tsx usage, but ideally UserProfile
    loading: boolean;
    retryAuth: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const initAuth = useCallback(async () => {
        setLoading(true);
        let mounted = true;

        try {
            console.log("DEBUG: AuthContext Init Started");
            
            // 3s Timeout Logic
            let sessionData = null;
            let error = null;

            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Auth timeout')), 3000)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]);
                sessionData = result.data.session;
                error = result.error;
            } catch (err: any) {
                if (err.message === 'Auth timeout') {
                    console.warn('DEBUG: AuthContext timeout - treating as no session');
                    await supabase.auth.signOut();
                    if (mounted) {
                         setSession(null);
                         setLoading(false);
                    }
                    return;
                }
                throw err;
            }

            if (error) {
                if (error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found")) {
                    console.warn("DEBUG: Stale session detected in Context. Clearing...");
                    await supabase.auth.signOut();
                    localStorage.removeItem('sb-eylnuxgwxlhyasigvzdj-auth-token');
                    if (mounted) setSession(null);
                    return;
                }
                throw error;
            }

            if (mounted) setSession(sessionData);

            if (sessionData?.user?.email) {
                console.log("DEBUG: Fetching Profile for", sessionData.user.email);
                const profile = await fetchUserProfile(sessionData.user.email);
                
                if (mounted) {
                    if (profile) {
                         setUserProfile(profile);
                    } else {
                        console.warn("DEBUG: Profile missing for session, signing out.");
                        await supabase.auth.signOut();
                        setSession(null);
                    }
                }
            }
        } catch (err) {
            console.error("AuthContext Init Failed:", err);
            await supabase.auth.signOut();
            if (mounted) setSession(null);
        } finally {
            if (mounted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (!mounted) return;
            
            // Simple check: Only re-fetch if session user changes significantly
            // or if we just signed in (newSession exists but we have no profile yet)
            
            if (newSession?.user?.email) {
                setSession(newSession);
                // Optimistic check: if we already have the right profile, don't refetch? 
                // For safety, let's fast-fetch.
                 const profile = await fetchUserProfile(newSession.user.email);
                 if (mounted) {
                     if (profile) setUserProfile(profile); 
                     else {
                         // If we have a session but NO profile, force logout? 
                         // Or maybe it's a new user logic inside fetchUserProfile?
                         // Consistent with App.tsx:
                         console.warn("DEBUG: AuthStateChange - Profile missing.");
                         // await supabase.auth.signOut(); // Strict mode
                     }
                 }
            } else {
                setSession(null);
                setUserProfile(null);
            }
            
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [initAuth]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile(null);
    };

    return (
        <AuthContext.Provider value={{ session, userProfile, loading, retryAuth: initAuth, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
