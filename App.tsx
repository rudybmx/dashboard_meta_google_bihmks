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
import { fetchCampaignData, fetchFranchises, supabase } from './services/supabaseService';
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
  const [authLoading, setAuthLoading] = useState(true);

  // App Data States
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads'>('dashboard');

  // New Filter States (RangeValue support)
  const [selectedFranchise, setSelectedFranchise] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [dateRange, setDateRange] = useState<RangeValue | null>({
      start: subDays(new Date(), 30),
      end: new Date()
  });

  // --- 2. EFFECTS ---

  // Auth Initialization
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!session) return; 

    const loadData = async () => {
      setLoading(true);
      try {
        const [campaignResult, franchiseList] = await Promise.all([
             fetchCampaignData(),
             fetchFranchises()
        ]);
        
        setData(campaignResult.data);
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
  }, [session]); 

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
     if (!dateRange?.start || !dateRange?.end) return [];

     // Calculate Previous Period
     const duration = dateRange.end.getTime() - dateRange.start.getTime();
     const prevEnd = new Date(dateRange.start.getTime() - 86400000); // 1 day before start
     const prevStart = new Date(prevEnd.getTime() - duration);

     return data.filter(d => {
       const matchFranchise = !selectedFranchise || d.franqueado === selectedFranchise;
       const matchAccount = !selectedAccount || d.account_name === selectedAccount;
       const itemDate = new Date(d.date_start + 'T12:00:00');
       const matchDate = itemDate >= prevStart && itemDate <= prevEnd;
       return matchFranchise && matchAccount && matchDate;
    });
  }, [selectedFranchise, selectedAccount, dateRange, data]);

  // --- 4. CONDITIONAL RENDERING ---

  if (authLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
           <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      );
  }

  if (!session) {
      return <LoginView />;
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-medium">Carregando dashboard...</p>
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
          className="border-none h-full"
        />
      </aside>

      {/* 2. MAIN CONTENT - COLUMNFLEX */}
      <div className="flex flex-1 flex-col overflow-hidden h-full">
        
        {/* HEADER - STICKY/FIXED TOP with HIGH Z-INDEX */}
        <header className="relative z-50 flex-none">
           {/* Mobile Nav Integration inside Header Row if needed, or separate */}
           <div className="lg:hidden p-4 bg-white border-b flex items-center justify-between">
                <MobileNav activeView={activeView} setActiveView={setActiveView} isDemoMode={isDemoMode} />
                <span className="font-bold">OP7 Dashboard</span>
           </div>

           {activeView === 'dashboard' ? (
               <DashboardHeader 
                  data={data}
                  selectedFranchisee={selectedFranchise}
                  setSelectedFranchisee={setSelectedFranchise}
                  selectedClient={selectedAccount}
                  setSelectedClient={setSelectedAccount}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                />
           ) : (
             <div className="h-16 flex items-center px-6 bg-white border-b border-slate-200 shadow-sm relative z-40">
                <h2 className="text-lg font-semibold">
                  {activeView === 'campaigns' ? 'Campanhas' : 
                   activeView === 'creatives' ? 'Criativos' : 
                   activeView === 'executive' ? 'Visão Executiva' :
                   activeView === 'demographics' ? 'Públicos' :
                   activeView === 'ads' ? 'Detalhamento de Anúncios' :
                   activeView === 'settings' ? 'Configurações' : ''}
                </h2>
             </div>
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
            {activeView === 'dashboard' && (
                <ManagerialView data={filteredData} comparisonData={comparisonData} />
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
                <SettingsView />
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