import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { SidebarProvider, SidebarTrigger } from './components/layout/AppSidebar';
import { AppSidebar } from './components/layout/AppSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { LoginView } from './components/LoginView';
import { fetchCampaignData, fetchFranchises, fetchKPIComparison, fetchSummaryReport, fetchMetaAccounts } from './services/supabaseService';
import { CampaignData, Franchise, SummaryReportRow } from './types';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { RangeValue } from '@/src/shared/ui/calendar';
import { subDays } from 'date-fns';
import { useAuth } from './src/auth/useAuth';
import { ViewLoader } from './components/ViewLoader';
import { useUserAccess } from './src/auth/useUserAccess';
import { ResolvedMetaAccount, ResolvedFranchise } from './src/auth/types';
import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/src/features/filters';
import { supabase } from './services/supabaseClient';
import { logger } from '@/src/shared/lib/logger';


// Retry wrapper for lazy imports — handles stale chunk 404s after new deploys
function lazyWithRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch((err) => {
      // Avoid infinite reload loop: only reload once per session
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => { }); // Never resolves — page will reload
      }
      sessionStorage.removeItem('chunk_reload');
      throw err; // Let ErrorBoundary handle after 1 retry
    })
  );
}

// Lazy load views for code splitting (with auto-retry on stale chunks)
const SummaryView = lazyWithRetry(() => import('./src/pages/SummaryView'));
const ManagerialView = lazyWithRetry(() => import('./src/pages/ManagerialView'));
const CockpitView = lazyWithRetry(() => import('./src/pages/CockpitView'));
const AIInsightsView = lazyWithRetry(() => import('./src/pages/AIInsightsView'));
const DashboardOverview = lazyWithRetry(() => import('./components/DashboardOverview'));
const CampaignsView = lazyWithRetry(() => import('./components/CampaignsView'));
const CreativesView = lazyWithRetry(() => import('./components/CreativesView'));
const DemographicsGeoView = lazyWithRetry(() => import('./components/DemographicsGeoView'));
const AdsTableView = lazyWithRetry(() => import('./components/AdsTableView'));
const SettingsView = lazyWithRetry(() => import('./components/SettingsView'));
const PlanningDashboardView = lazyWithRetry(() => import('./components/PlanningDashboardView'));
const BMSettingsTab = lazyWithRetry(() => import('./components/BMSettingsTab'));

export default function App() {

  const { session, userProfile, loading: authLoading, error: authError, logout } = useAuth();

  // App Data States
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'cockpit' | 'dashboard' | 'settings' | 'settings_accounts' | 'settings_users' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary' | 'planning' | 'ai_insights'>('summary');
  const [formattedComparisonData, setFormattedComparisonData] = useState<CampaignData[]>([]);
  const [kpiRpcData, setKpiRpcData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<SummaryReportRow[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [effectiveAccountIds, setEffectiveAccountIds] = useState<string[]>([]);

  // Filter States - Managed by FSD Context now
  const { selectedAccounts, setSelectedAccounts, selectedCluster, setSelectedCluster, dateRange, setDateRange, selectedPlatform, setSelectedPlatform } = useFilters();

  // Clean URL parameters on mount
  useEffect(() => {
    if (window.location.search) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Estabilizar datas para evitar triggers de useEffect desnecessários
  const stableDates = useMemo(() => {
    return {
      startText: dateRange?.start ? dateRange.start.toISOString() : '',
      endText: dateRange?.end ? dateRange.end.toISOString() : ''
    };
  }, [dateRange?.start, dateRange?.end]);

  // --- ACCESS CONTROL HOOK ---
  const {
    isAdmin,
    isClient,
    allowedAccountIds,
    allowedClusterIds,
    filterAccountsByAccess
  } = useUserAccess(userProfile);

  // --- DATA FETCHING (QUERIES) ---
  // Load franchises and accounts once (or when session changes)
  const { data: allFranchises } = useMemo(() => ({ data: officialFranchises }), [officialFranchises]); // Legacy compat until we move to useQuery fully
  // We keep existing fetchFranchises effect for now to minimize diff, but we could useQuery here.

  // --- FILTERED LISTS (MEMOIZED) ---
  const availableFranchises = useMemo(() => {
    if (!officialFranchises.length) return [];

    if (isAdmin) return officialFranchises;

    // Derive franchises from accessible accounts
    if (metaAccounts.length > 0) {
      const allowedFranchiseIds = new Set(metaAccounts.map(a => a.franchise_id).filter(Boolean));
      return officialFranchises.filter(f => allowedFranchiseIds.has(f.id));
    }

    return [];
  }, [officialFranchises, metaAccounts, isAdmin]);

  const availableAccounts = useMemo(() => {
    if (!metaAccounts.length) return [];

    const mappedAccounts: ResolvedMetaAccount[] = metaAccounts.map(a => ({
      ...a,
      id: a.account_id,
      franchise_id: a.franchise_id || null, // Ensure compatibility
      franchise_name: a.franchise_name || ''
    }));

    return filterAccountsByAccess(mappedAccounts);
  }, [metaAccounts, filterAccountsByAccess]);


  // Load Data
  useEffect(() => {
    if (!session || !userProfile || !dateRange?.start || !dateRange?.end) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const start = dateRange.start!;
        const end = dateRange.end!;

        // Determina franquias para filtro (IDs sent to Service)
        // Always empty means "all accessible" (Service handles logic)
        const franchiseIdsForService: string[] = [];

        /* Removed filter logic
        if (selectedFranchise) {
          // ...
          const found = availableFranchises.find(f => f.name === selectedFranchise);
          if (found) {
             franchiseIdsForService = [found.id];
          } else {
             logger.warn(`Selected franchise "${selectedFranchise}" not found in available list.`);
          }
        } 
        */
        // If not selected, we send empty (server handles "all" or we rely on account filtering)

        // Fetch Accounts First (to have the list for filtering)
        const allAccountsRaw = await fetchMetaAccounts();

        // Filter accounts for the dropdown/state
        const mappedAccounts: ResolvedMetaAccount[] = allAccountsRaw.map(a => {
          const franchise = officialFranchises.find(f => f.id === a.franchise_id);
          return {
            ...a,
            id: a.account_id,
            franchise_id: a.franchise_id || null,
            franchise_name: franchise?.name || '',
            status: (a.status === 'removed' ? 'removed' : 'active') as 'active' | 'removed' | 'disabled'
          };
        });

        const filteredAccounts = filterAccountsByAccess(mappedAccounts);
        setMetaAccounts(filteredAccounts);

        // --- FILTER LOGIC: Compute effective account IDs for fetchCampaignData ---
        // Admin: sem assigned_account_ids → usa IDs de todas as contas carregadas
        // Client: usa allowedAccountIds (assigned_account_ids do perfil)
        let effectiveAccountIds: string[] = [];

        const visibleAllowedIds = filteredAccounts.map(a => a.account_id);

        if (selectedAccounts && selectedAccounts.length > 0) {
          // Specific accounts selected - must still be visible
          effectiveAccountIds = selectedAccounts.filter(id => visibleAllowedIds.includes(id));
          if (effectiveAccountIds.length === 0) effectiveAccountIds = ['NONE'];
        } else if (selectedCluster && selectedCluster !== 'ALL') {
          const { data: clusterAccs } = await (supabase.from as any)('cluster_accounts').select('account_id').eq('cluster_id', selectedCluster);
          const clusterAccountIds = clusterAccs?.map((a: any) => a.account_id) || [];

          // Intersect cluster accounts with visible and allowed accounts
          effectiveAccountIds = clusterAccountIds.filter((id: string) => visibleAllowedIds.includes(id));

          if (effectiveAccountIds.length === 0) {
            // Se o cluster não tem contas ou o usuário não tem permissão para testá-las
            effectiveAccountIds = ['NONE'];
          }
        } else {
          // Default: All Allowed and Visible Accounts
          effectiveAccountIds = visibleAllowedIds;
          if (effectiveAccountIds.length === 0) effectiveAccountIds = ['NONE'];
        }

        setEffectiveAccountIds(effectiveAccountIds);

        // For RPCs that still use franchise/account params (KPI, Summary)
        const serviceAccountFilter = effectiveAccountIds.length > 0 && effectiveAccountIds[0] !== 'NONE'
          ? effectiveAccountIds
          : [];

        logger.info('Loading dashboard data:', {
          role: userProfile.role,
          effectiveIds: effectiveAccountIds.length,
          filterMode: selectedAccounts.length > 0 ? selectedAccounts.join(',') : 'NONE'
        });

        // Now fetch data
        const [campaignResult, kpiResult, summaryResult] = await Promise.all([
          fetchCampaignData(start, end, effectiveAccountIds, selectedPlatform),
          fetchKPIComparison(start, end, franchiseIdsForService, serviceAccountFilter),
          fetchSummaryReport(start, end, franchiseIdsForService, serviceAccountFilter)
        ]);

        setData(campaignResult.current);
        setFormattedComparisonData(campaignResult.previous);
        setKpiRpcData(kpiResult);
        setSummaryData(summaryResult);

        setIsDemoMode(campaignResult.isMock);
        if (campaignResult.isMock) setConnectionError(campaignResult.error);
        setIsDataLoaded(true);

      } catch (err) {
        logger.error("Critical data loading failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Dependencies: Stable ones only
  }, [
    session,
    userProfile?.id,
    dateRange?.start?.toISOString(),
    dateRange?.end?.toISOString(),
    selectedAccounts,
    selectedCluster,
    selectedPlatform
    // availableFranchises removed to prevent loop (it depends on metaAccounts which is set here)
  ]);

  // Sync Filters to LocalStorage (URL Sync Removed)
  useEffect(() => {
    // localStorage.setItem('op7_franchise_filter', selectedFranchise);
    localStorage.setItem('op7_account_filter', JSON.stringify(selectedAccounts));
  }, [selectedAccounts]);

  // Save Dates to LocalStorage
  useEffect(() => {
    if (dateRange?.start && dateRange?.end) {
      localStorage.setItem('op7_date_range', JSON.stringify({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      }));
    }
  }, [dateRange]);

  // Dynamic Balance Calculation (Reactive to UI Filters + RBAC)
  const currentFilteredBalance = useMemo(() => {
    if (!metaAccounts.length) return 0;

    // Franchise filter removed - calculate for all visible accounts

    return metaAccounts
      .filter(acc => {
        if (selectedAccounts.length === 0 || selectedAccounts.includes('ALL')) return true; // Sum matching accounts
        const matchAccount = selectedAccounts.includes(acc.account_id) || selectedAccounts.includes(acc.account_name);
        return matchAccount;
      })
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [metaAccounts, selectedAccounts]);

  // Separate Effect for Franchises (Only once or when profile changes)
  useEffect(() => {
    if (!session) return;
    const loadFranchises = async () => {
      try {
        const list = await fetchFranchises();
        setOfficialFranchises(list);
      } catch (e) {
        logger.error("Failed to load franchises", e);
      }
    };
    loadFranchises();
  }, [session]);

  // Filters Reset
  // Filters Reset - REMOVED
  // useEffect(() => { setSelectedAccount(''); }, [selectedFranchise]);

  const filteredData = useMemo(() => {
    // RBAC: Require account selection - no data shown without specific account
    if (!selectedAccounts) return [];

    return data.filter(d => {
      // Logic for ALL
      if (selectedAccounts.length === 0 || selectedAccounts.includes('ALL')) {
        // If Admin, generic ALL shows everything.
        // If Client, data is already restricted by fetching logic (loadData sends restricted IDs).
        // So filtering by "ALL" here just means "don't filter by specific account ID".
        return true;
      }

      // Handle both 'act_' prefixed and numeric account IDs
      const normalizedIds = selectedAccounts.map(id => id.replace(/^act_/i, ''));
      const matchAccount = selectedAccounts.includes(d.account_id) ||
        normalizedIds.includes(d.account_id) ||
        selectedAccounts.includes(d.account_name);

      return matchAccount; // matchFranchise && matchAccount;
    });
  }, [selectedAccounts, data]);

  const comparisonData = useMemo(() => {
    // RBAC: Require account selection - no data shown without specific account
    if (!selectedAccounts) return [];

    return formattedComparisonData.filter(d => {
      if (selectedAccounts.length === 0 || selectedAccounts.includes('ALL')) return true;

      // Handle both 'act_' prefixed and numeric account IDs
      const normalizedIds = selectedAccounts.map(id => id.replace(/^act_/i, ''));
      const matchAccount = selectedAccounts.includes(d.account_id) ||
        normalizedIds.includes(d.account_id) ||
        selectedAccounts.includes(d.account_name);

      return matchAccount; // matchFranchise && matchAccount;
    });
  }, [selectedAccounts, formattedComparisonData]);

  // Auth Guards & Loading
  if (authLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">Autenticando...</p>
      </div>
    </div>
  );

  if (authError) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Erro de Acesso</h3>
        <p className="text-sm text-slate-500">{authError}</p>
        <button onClick={logout} className="w-full mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Sair</button>
      </div>
    </div>
  );

  if (!session) return <LoginView />;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-black overflow-hidden">
        <AppSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          userRole={userProfile?.role}
          userName={userProfile?.name}
          userEmail={userProfile?.email}
        />

        <div className="flex flex-1 flex-col overflow-hidden h-full">
          <header className="relative z-50 flex-none">
            <div className="lg:hidden p-4 bg-black border-b flex items-center justify-between">
              <SidebarTrigger className="h-9 w-9" />
              <span className="font-bold text-white">BIHMKS.GOW PLATAFORMA</span>
            </div>
            {activeView === 'settings' || activeView === 'settings_accounts' || activeView === 'settings_users' ? (
              <div className="h-20 flex items-center px-6 bg-black border-b border-white/10 shadow-sm relative z-40">
                <h2 className="text-xl font-bold text-white tracking-tight">Configurações</h2>
              </div>
            ) : activeView === 'cockpit' || activeView === 'ai_insights' ? (
              <div className="h-20 flex items-center px-6 bg-black border-b border-white/10 shadow-sm relative z-40">
                <h2 className="text-xl font-bold text-white tracking-tight">{activeView === 'cockpit' ? 'Cockpit de Controle' : 'Insights IA'}</h2>
              </div>
            ) : (
              <DashboardHeader
                title={activeView === 'cockpit' ? 'Cockpit de Controle' : activeView === 'ai_insights' ? 'Insights IA' : activeView === 'dashboard' ? 'Visão Gerencial' : activeView === 'summary' ? 'Resumo Gerencial' : activeView === 'executive' ? 'Visão Executiva' : activeView === 'campaigns' ? 'Performance de Campanhas' : activeView === 'creatives' ? 'Galeria de Criativos' : activeView === 'ads' ? 'Detalhamento de Anúncios' : activeView === 'demographics' ? 'Inteligência de Público' : activeView === 'planning' ? 'Planejamento Analítico' : activeView === 'settings_accounts' ? 'Contas de Anúncios' : activeView === 'settings_users' ? 'Usuários e Acessos' : 'Dashboard'}
                data={data}
                selectedClients={selectedAccounts}
                setSelectedClients={setSelectedAccounts}
                selectedCluster={selectedCluster}
                setSelectedCluster={setSelectedCluster}
                dateRange={dateRange}
                setDateRange={setDateRange}
                isLocked={availableFranchises.length === 1 && userProfile?.role !== 'admin'}
                availableFranchises={availableFranchises}
                metaAccounts={availableAccounts}
                userRole={userProfile?.role}
                assignedAccountIds={allowedAccountIds}
                assignedClusterIds={allowedClusterIds}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
              />
            )}
          </header>

          <main className="flex-1 overflow-y-auto bg-white p-6 scroll-smooth">
            <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-10">
              {isDemoMode && connectionError && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">Atenção: Modo Offline. Exibindo dados de exemplo.</div>}

              <Suspense fallback={<ViewLoader />}>
                {activeView === 'cockpit' && (
                  <CockpitView
                    data={filteredData}
                    dateRange={dateRange}
                    selectedAccounts={selectedAccounts}
                    metaAccounts={metaAccounts}
                    userProfile={userProfile}
                    onNavigateView={setActiveView}
                  />
                )}
                {activeView === 'ai_insights' && (
                  <AIInsightsView userProfile={userProfile} />
                )}
                {activeView === 'summary' && (
                  <SummaryView
                    data={filteredData}
                    selectedFranchisee={''}
                    selectedClient={selectedAccounts.length === 1 ? selectedAccounts[0] : 'ALL'}
                    dateRange={dateRange}
                    allowedFranchises={availableFranchises.map(f => f.name)}
                    allowedAccounts={allowedAccountIds}
                    externalSummaryData={summaryData}
                    externalLoading={loading && !isDataLoaded}
                    effectiveAccountIds={effectiveAccountIds}
                  />
                )}
                {activeView === 'planning' && <PlanningDashboardView allowedFranchises={availableFranchises.map(f => f.name)} userRole={userProfile?.role} />}
                {activeView === 'dashboard' && (
                  <ManagerialView
                    dateRange={dateRange}
                    accountIds={effectiveAccountIds}
                  />
                )}
                {activeView === 'executive' && <DashboardOverview data={filteredData} />}
                {activeView === 'campaigns' && <CampaignsView data={filteredData} />}
                {activeView === 'ads' && (
                  <AdsTableView
                    data={filteredData}
                    onCampaignClick={(campaignName) => {
                      setActiveView('campaigns');
                    }}
                  />
                )}
                {activeView === 'creatives' && <CreativesView data={filteredData} />}
                {activeView === 'demographics' && <DemographicsGeoView data={filteredData} />}
                {(activeView === 'settings' || activeView === 'settings_accounts' || activeView === 'settings_users') && (userProfile?.role === 'admin' || userProfile?.role === 'executive') ? <SettingsView userRole={userProfile?.role} /> : (activeView === 'settings' || activeView === 'settings_accounts' || activeView === 'settings_users') && (
                  <div className="flex h-[60vh] w-full items-center justify-center">
                    <div className="flex max-w-md flex-col items-center text-center gap-4 p-8 bg-white rounded-2xl border border-slate-200">
                      <Shield className="h-12 w-12 text-red-500 bg-red-50 p-3 rounded-full mb-2" />
                      <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
                      <p className="text-slate-500">Seu perfil ({userProfile?.role}) não possui permissão para acessar as configurações.</p>
                      <button onClick={() => setActiveView('dashboard')} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Voltar ao Dashboard</button>
                    </div>
                  </div>
                )}
              </Suspense>

              <footer className="text-center text-muted-foreground text-xs py-8">&copy; {new Date().getFullYear()} BIHMKS&bull;GOW</footer>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
