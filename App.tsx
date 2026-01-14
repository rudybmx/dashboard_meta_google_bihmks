import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardHeader } from './components/DashboardHeader';
import { ManagerialView } from './components/ManagerialView';
import { SettingsView } from './components/SettingsView';
import { CampaignsView } from './components/CampaignsView';
import { CreativesView } from './components/CreativesView';
import { LoginView } from './components/LoginView'; 
import { DashboardOverview } from './components/DashboardOverview';
import { DemographicsGeoView } from './components/DemographicsGeoView';
import { AdsTableView } from './components/AdsTableView';
import { SummaryView } from './components/SummaryView';
import { fetchCampaignData, fetchFranchises, fetchKPIComparison, supabase } from './services/supabaseService';
import { CampaignData, Franchise } from './types';
import { Loader2 } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { RangeValue } from './components/ui/calendar';
import { subDays, startOfMonth } from 'date-fns';

const REFERENCE_DATE = new Date(); // Or today

export default function App() {
  // --- 1. ALL HOOKS MUST BE DECLARED AT THE TOP ---

  // Auth States
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // Store full profile
  const [authLoading, setAuthLoading] = useState(true);

  // App Data States
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary'>('dashboard');
  const [formattedComparisonData, setFormattedComparisonData] = useState<CampaignData[]>([]);
  const [kpiRpcData, setKpiRpcData] = useState<any>(null); // New State for RPC Data

  // New Filter States (RangeValue support)
  const [selectedFranchise, setSelectedFranchise] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [dateRange, setDateRange] = useState<RangeValue | null>({
      start: subDays(new Date(), 30),
      end: new Date()
  });

  // --- 2. EFFECTS ---

  // Auth Initialization
  // Auth Initialization & Profile Fetch
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) setSession(session);
            
            if (session?.user) {
                // Safe fetch - prevent crashing if profile doesn't exist or RLS blocks
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error) {
                    console.warn("Error fetching profile on init:", error);
                }
                
                if (mounted && profile) {
                    setUserProfile(profile);
                }
            }
        } catch (error) {
            console.error("Auth init failed:", error);
        } finally {
            if (mounted) setAuthLoading(false);
        }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      
      if (session?.user) {
         const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
         if (mounted) setUserProfile(profile);
      } else {
         if (mounted) setUserProfile(null);
      }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!session) return; 

    const loadData = async () => {
      setLoading(true);
      try {
        // Ensure dates are valid
        const start = dateRange?.start || subDays(new Date(), 30);
        const end = dateRange?.end || new Date();

        const [campaignResult, franchiseList, kpiResult] = await Promise.all([
             fetchCampaignData(start, end),
             fetchFranchises(),
             fetchKPIComparison(start, end)
        ]);
        
        console.log("DEBUG: Dates", { start, end });
        console.log("DEBUG: KPI RPC Result", kpiResult);
        console.log("DEBUG: Comparison Data (Dual Query)", campaignResult.previous?.length);

        setData(campaignResult.current);
        setFormattedComparisonData(campaignResult.previous);
        setKpiRpcData(kpiResult);

        setOfficialFranchises(franchiseList);
        setIsDemoMode(campaignResult.isMock);
        
        if (campaignResult.isMock && campaignResult.error) {
           setConnectionError(campaignResult.error);
        }

      } catch (err) {
        console.error("Critical Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session, dateRange]); // Re-fetch when Date Range changes!

  // Reset account selection when franchise changes
  useEffect(() => {
    setSelectedAccount('');
  }, [selectedFranchise]);

  // --- 3. MEMOS (Derivations) ---
  
  // Note: Franchises and Accounts processing moved to Header, but filtering data remains here.


  // Filter Component Data
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchFranchise = !selectedFranchise || d.franqueado === selectedFranchise;
      const matchAccount = !selectedAccount || d.account_name === selectedAccount;
      
      // Date Filtering using RangeValue
      let matchDate = true;
      if (dateRange?.start && dateRange?.end) {
          const itemDate = new Date(d.date_start + 'T12:00:00'); 
          // Compare as start/end of days
          const start = new Date(dateRange.start); start.setHours(0,0,0,0);
          const end = new Date(dateRange.end); end.setHours(23,59,59,999);
          matchDate = itemDate >= start && itemDate <= end;
      }

      return matchFranchise && matchAccount && matchDate;
    });
  }, [selectedFranchise, selectedAccount, dateRange, data]);

  // Comparison Data Logic
  const comparisonData = useMemo(() => {
     // Now we just filter the *already fetched* previous data by Franchise/Account
     return formattedComparisonData.filter(d => {
       const matchFranchise = !selectedFranchise || d.franqueado === selectedFranchise;
       const matchAccount = !selectedAccount || d.account_name === selectedAccount;
       // Date filtering is already done by API!
       return matchFranchise && matchAccount;
    });
  }, [selectedFranchise, selectedAccount, formattedComparisonData]);

  // --- 4. CONDITIONAL RENDERING ---

  // --- 4. DATA SECURITY & AUTOMATION ---
  useEffect(() => {
    // Auto-Select Franchise for 'Franqueado' Role
    if (userProfile && userProfile.role === 'franqueado' && userProfile.assigned_franchise_ids?.length > 0) {
        // We need to match the ID to the Name because the legacy system uses Name as ID in dropdowns
        // Or if 'assigned_franchise_ids' contains the ID, and we have the list available.
        // Assuming the ID in profile maps to the 'franqueado' column logic which seems to be ID-based in legacy views?
        // Actually, looking at `fetchCampaignData`, it returns `franqueado` column.
        // Let's assume the ID matches. IF NOT, we might need a mapping.
        
        // Simpler approach: If the user has access to ONLY ONE franchise (which is true for franqueado),
        // and we have data loaded, just pick the first available franchise in the data.
        
        // BETTER: Use the ID from profile to find the name in `officialFranchises` list.
        if (officialFranchises.length > 0) {
            const myFranchiseId = userProfile.assigned_franchise_ids[0];
            const found = officialFranchises.find(f => f.id === myFranchiseId);
            
            // CRITICAL FIX: The Dashboard filters by NAME (string), not ID.
            // We must set the Name found from the ID.
            if (found && selectedFranchise !== found.name) { 
               setSelectedFranchise(found.name); 
            }
        }
    }
  }, [userProfile, officialFranchises, selectedFranchise]);

  if (authLoading || (session && !userProfile)) {
       return (
         <div className="flex h-screen w-full items-center justify-center bg-slate-50">
           <div className="flex flex-col items-center gap-3">
             <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
             <p className="text-sm font-medium text-slate-500 animate-pulse">Carregando acessos...</p>
           </div>
         </div>
       );
  }

  if (!session) {
      return <LoginView />;
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-indigo-100 flex flex-col items-center">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-slate-600 font-bold">Carregando dados...</p>
            <p className="text-xs text-slate-400">Sincronizando estatísticas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      
      {/* 1. SIDEBAR DESKTOP - FIXED */}
      <aside className="hidden lg:flex w-72 flex-col border-r bg-card h-full">
         <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isDemoMode={isDemoMode} 
          userRole={userProfile?.role}
          userName={userProfile?.name}
          userEmail={userProfile?.email}
          className="border-none h-full"
        />
      </aside>

      {/* 2. MAIN CONTENT - COLUMNFLEX */}
      <div className="flex flex-1 flex-col overflow-hidden h-full">
        
        {/* HEADER - STICKY/FIXED TOP with HIGH Z-INDEX */}
        <header className="relative z-50 flex-none">
           {/* Mobile Nav Integration inside Header Row if needed, or separate */}
           {/* Mobile Nav Integration inside Header Row if needed, or separate */}
           <div className="lg:hidden p-4 bg-white border-b flex items-center justify-between">
                <MobileNav activeView={activeView} setActiveView={setActiveView} isDemoMode={isDemoMode} />
                <span className="font-bold">OP7 Dashboard</span>
           </div>

           {activeView === 'settings' ? (
             <div className="h-20 flex items-center px-6 bg-white border-b border-slate-200 shadow-sm relative z-40">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configurações</h2>
             </div>
           ) : (
             <DashboardHeader 
                title={
                    activeView === 'dashboard' ? 'Visão Gerencial' :
                    activeView === 'summary' ? 'Resumo Gerencial' :
                    activeView === 'executive' ? 'Visão Executiva' :
                    activeView === 'campaigns' ? 'Performance de Campanhas' :
                    activeView === 'creatives' ? 'Galeria de Criativos' :
                    activeView === 'ads' ? 'Detalhamento de Anúncios' :
                    activeView === 'demographics' ? 'Inteligência de Público' : 'Dashboard'
                }
                data={data}
                selectedFranchisee={selectedFranchise}
                setSelectedFranchisee={setSelectedFranchise}
                selectedClient={selectedAccount}
                setSelectedClient={setSelectedAccount}
                dateRange={dateRange}
                setDateRange={setDateRange}
                isLocked={userProfile?.role === 'franqueado'}
              />
           )}
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-10">
            
            {isDemoMode && connectionError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                    Atenção: Modo Offline. Exibindo dados de exemplo. ({connectionError})
                </div>
            )}

            {/* Views */}
            {activeView === 'summary' && (
                <SummaryView 
                    data={filteredData} 
                    selectedFranchisee={selectedFranchise}
                    selectedClient={selectedAccount}
                />
            )}

            {activeView === 'dashboard' && (
                <ManagerialView 
                    data={filteredData} 
                    comparisonData={comparisonData} 
                    kpiData={kpiRpcData} // Pass the RPC data
                />
            )}

            {activeView === 'executive' && (
                <DashboardOverview data={filteredData} />
            )}

            {activeView === 'campaigns' && (
                <CampaignsView data={filteredData} />
            )}

            {activeView === 'ads' && (
                <AdsTableView data={filteredData} />
            )}

            {activeView === 'creatives' && (
                <CreativesView data={filteredData} />
            )}

            {activeView === 'demographics' && (
                <DemographicsGeoView data={filteredData} />
            )}

            {activeView === 'settings' && (
                (userProfile?.role === 'admin' || userProfile?.role === 'executive') ? (
                    <SettingsView />
                ) : (
                    <div className="flex h-64 items-center justify-center flex-col gap-2 text-slate-400">
                        <Loader2 className="animate-spin" /> 
                        <span>Verificando permissões...</span>
                        {/* Fallback instant if loaded */}
                        {userProfile && <span className="text-red-500 font-bold border border-red-200 bg-red-50 px-4 py-2 rounded-lg">Acesso Negado</span>}
                    </div>
                )
            )}
           
            <footer className="text-center text-muted-foreground text-xs py-8">
              &copy; {new Date().getFullYear()} OP7 Performance.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}