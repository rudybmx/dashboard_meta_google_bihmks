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
import { Loader2, Shield } from 'lucide-react';
import { RangeValue } from './components/ui/calendar';
import { subDays, startOfMonth } from 'date-fns';
import { useAuth } from './contexts/AuthContext';

const REFERENCE_DATE = new Date(); // Or today

export default function App() {
  // --- 1. ALL HOOKS MUST BE DECLARED AT THE TOP ---

  // Auth States via Context (Centralized Source of Truth)
  const { session, userProfile, loading: authLoading } = useAuth();

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
  
  // 1. Compute Available Franchises based on Permissions
  const availableFranchises = useMemo(() => {
     if (!userProfile) return [];
     
     // Admin see all
     if (userProfile.role === 'admin' || userProfile.role === 'executive') {
         return officialFranchises;
     }

     // Clients see none (they filter by Account)
     if (userProfile.role === 'client') {
         return [];
     }

     // Franchisees / Multi: Filter by Assigned IDs
     // We match IDs to the official list to get Names
     const assignedIds = userProfile.assigned_franchise_ids || [];
     return officialFranchises.filter(f => assignedIds.includes(f.id));
  }, [userProfile, officialFranchises]);

  // 2. Auto-Select & Lock Logic
  useEffect(() => {
    // If only one franchise is available, enforce it.
    if (availableFranchises.length === 1) {
        const onlyFranchise = availableFranchises[0];
        
        // Critical: Match by NAME because RPC expects Text Filter
        if (selectedFranchise !== onlyFranchise.name) {
            console.log("DEBUG: Auto-Selecting Single Franchise:", onlyFranchise.name);
            setSelectedFranchise(onlyFranchise.name);
        }
    }
  }, [availableFranchises, selectedFranchise]);

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
                isLocked={availableFranchises.length === 1 && userProfile?.role !== 'admin'}
                availableFranchises={availableFranchises}
                userRole={userProfile?.role}
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
                    dateRange={dateRange}
                />
            )}

            {activeView === 'dashboard' && (
                <ManagerialView 
                    data={filteredData} 
                    comparisonData={comparisonData} 
                    kpiData={kpiRpcData} // Pass the RPC data
                    selectedFranchisee={selectedFranchise}
                    selectedClient={selectedAccount}
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

            {activeView === 'settings' && (() => {
                // DEBUG: Audit user role for access issues
                console.log("DEBUG AUTH VIEW:", { 
                    role: userProfile?.role, 
                    email: userProfile?.email,
                    permissions: userProfile?.permissions 
                });

                const hasAccess = userProfile?.role === 'admin' || userProfile?.role === 'executive';

                if (hasAccess) {
                    return <SettingsView userRole={userProfile?.role} />;
                }

                // Access Denied State
                return (
                    <div className="flex h-[60vh] w-full items-center justify-center">
                        <div className="flex max-w-md flex-col items-center text-center gap-4 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
                                <Shield className="h-6 w-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
                            <p className="text-slate-500">
                                Seu perfil ({userProfile?.role || 'Visitante'}) não possui permissão para acessar as configurações do sistema.
                            </p>
                            <button 
                                onClick={() => setActiveView('dashboard')}
                                className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                            >
                                Voltar ao Dashboard
                            </button>
                        </div>
                    </div>
                );
            })()}
           
            <footer className="text-center text-muted-foreground text-xs py-8">
              &copy; {new Date().getFullYear()} OP7 Performance.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}