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
import { PlanningDashboardView } from './components/PlanningDashboardView';
import { fetchCampaignData, fetchFranchises, fetchKPIComparison, fetchSummaryReport, fetchMetaAccounts } from './services/supabaseService';
import { CampaignData, Franchise, SummaryReportRow } from './types';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { RangeValue } from './components/ui/calendar';
import { subDays } from 'date-fns';
import { useAuth } from './src/auth/useAuth';

export default function App() {
  console.log('[App.tsx] 🟢 App renderizando');

  const { session, userProfile, loading: authLoading, error: authError, logout } = useAuth();

  // App Data States
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary' | 'planning'>('summary');
  const [formattedComparisonData, setFormattedComparisonData] = useState<CampaignData[]>([]);
  const [kpiRpcData, setKpiRpcData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<SummaryReportRow[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Filter States
  // Filter States - Priority: URL > LocalStorage > Default
  const [selectedFranchise, setSelectedFranchise] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('franchise')) return params.get('franchise')!;
    return localStorage.getItem('op7_franchise_filter') || '';
  });

  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('account')) return params.get('account')!;
    return localStorage.getItem('op7_account_filter') || '';
  });

  const [dateRange, setDateRange] = useState<RangeValue | null>(() => {
    const savedDates = localStorage.getItem('op7_date_range');
    if (savedDates) {
      try {
        const parsed = JSON.parse(savedDates);
        return {
          start: new Date(parsed.start),
          end: new Date(parsed.end)
        };
      } catch (e) {
        console.error("Failed to parse saved dates", e);
      }
    }
    return {
      start: subDays(new Date(), 1),
      end: subDays(new Date(), 1)
    };
  });

  // Estabilizar datas para evitar triggers de useEffect desnecessários
  const stableDates = useMemo(() => {
    return {
      startText: dateRange?.start ? dateRange.start.toISOString() : '',
      endText: dateRange?.end ? dateRange.end.toISOString() : ''
    };
  }, [dateRange?.start, dateRange?.end]);

  // Derived Values - Declared before useEffect to avoid hoisting issues
  const availableFranchises = useMemo(() => {
    if (!userProfile) return [];
    if (userProfile.role === 'admin' || userProfile.role === 'executive') return officialFranchises;
    if (userProfile.role === 'client') return [];

    // Garantir que assigned_franchise_ids é sempre um array
    const assignedIds = Array.isArray(userProfile.assigned_franchise_ids)
      ? userProfile.assigned_franchise_ids
      : [];

    console.log('[Filter/App] Role:', userProfile.role);
    console.log('[Filter/App] Assigned Values:', assignedIds);

    // Tentamos filtrar por ID ou NAME para ser resiliente
    const filtered = officialFranchises.filter(f =>
      assignedIds.includes(f.id) || assignedIds.includes(f.name)
    );

    console.log('[Filter/App] Result:', filtered);
    return filtered;
  }, [userProfile, officialFranchises]);

  // Derived Strings for stable dependencies
  const franchiseString = useMemo(() =>
    availableFranchises.map(f => f.name).sort().join(','),
    [availableFranchises]
  );

  const accountString = useMemo(() =>
    (userProfile?.assigned_account_ids || []).sort().join(','),
    [userProfile?.assigned_account_ids]
  );

  // Load Data
  useEffect(() => {
    if (!session || !userProfile) return;

    // For non-admin users, wait for franchises to load before fetching data
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'executive';
    const isClient = userProfile.role === 'client';

    // If user has restricted access by franchise, wait for franchises to be calculated
    if (!isAdmin && !isClient && !franchiseString) {
      console.log('[App] Waiting for franchise restrictions to load...');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const start = stableDates.startText ? new Date(stableDates.startText) : subDays(new Date(), 30);
        const end = stableDates.endText ? new Date(stableDates.endText) : new Date();

        // Use UI-selected filters if set, otherwise use profile defaults
        const franchiseNames = selectedFranchise ? [selectedFranchise] : (franchiseString ? franchiseString.split(',') : []);

        // Strip 'act_' prefix from account IDs if present (database uses numeric format)
        const normalizedAccountId = selectedAccount ? selectedAccount.replace(/^act_/i, '') : '';
        const accountIds = normalizedAccountId ? [normalizedAccountId] : (accountString ? accountString.split(',') : []);

        console.log('[App] Loading data with UI filters:', {
          role: userProfile.role,
          selectedFranchise,
          selectedAccount,
          normalizedAccountId,
          franchises: franchiseNames,
          accounts: accountIds,
          dates: { start, end }
        });

        const [campaignResult, kpiResult, summaryResult, allAccounts] = await Promise.all([
          fetchCampaignData(start, end, franchiseNames, accountIds),
          fetchKPIComparison(start, end, franchiseNames, accountIds),
          fetchSummaryReport(start, end, franchiseNames, accountIds),
          fetchMetaAccounts()
        ]);

        setData(campaignResult.current);
        setFormattedComparisonData(campaignResult.previous);
        setKpiRpcData(kpiResult);
        setSummaryData(summaryResult);
        setMetaAccounts(allAccounts);
        setIsDemoMode(campaignResult.isMock);
        if (campaignResult.isMock) setConnectionError(campaignResult.error);

        setIsDataLoaded(true);

      } catch (err) {
        console.error("Critical Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // VITAL: Include franchiseString to reload when franchise restrictions are available
    // REMOVED 'session' from dependencies to prevent re-fetching on token refresh (window focus)
    // REFACTOR: The derived strings (franchiseString, accountString) are primitive strings. 
    // They are stable dependencies that only change when permissions actually change (due to AuthProvider stability fix).
  }, [userProfile?.id, userProfile?.role, stableDates.startText, stableDates.endText, selectedFranchise, selectedAccount, franchiseString, accountString]);

  // Sync URL with filters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedFranchise) params.set('franchise', selectedFranchise);
    else params.delete('franchise');

    if (selectedAccount) params.set('account', selectedAccount);
    else params.delete('account');

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);

    // Save to LocalStorage
    localStorage.setItem('op7_franchise_filter', selectedFranchise);
    localStorage.setItem('op7_account_filter', selectedAccount);
  }, [selectedFranchise, selectedAccount]);

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

    // Use selectedFranchise if set, otherwise use user's assigned franchises
    const effectiveFranchiseFilter = selectedFranchise ||
      (availableFranchises.length === 1 ? availableFranchises[0].name : '');

    // For RBAC: get all allowed franchise names if no specific filter
    const allowedFranchiseNames = availableFranchises.map(f => f.name);

    return metaAccounts
      .filter(acc => {
        // If a specific franchise is selected, use that filter
        if (effectiveFranchiseFilter) {
          return acc.franchise_id === effectiveFranchiseFilter;
        }
        // Otherwise, filter by all allowed franchises (for RBAC)
        if (allowedFranchiseNames.length > 0) {
          return allowedFranchiseNames.includes(acc.franchise_id);
        }
        // Admins/executives see all
        return true;
      })
      .filter(acc => {
        const matchAccount = !selectedAccount || acc.account_id === selectedAccount || acc.account_name === selectedAccount;
        return matchAccount;
      })
      .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [metaAccounts, selectedFranchise, selectedAccount, availableFranchises]);

  // Separate Effect for Franchises (Only once or when profile changes)
  useEffect(() => {
    if (!session) return;
    const loadFranchises = async () => {
      try {
        const list = await fetchFranchises();
        setOfficialFranchises(list);
      } catch (e) {
        console.error("Failed to load franchises", e);
      }
    };
    loadFranchises();
  }, [session]);

  // Filters Reset
  useEffect(() => { setSelectedAccount(''); }, [selectedFranchise]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchFranchise = !selectedFranchise || d.franqueado === selectedFranchise;

      // Handle both 'act_' prefixed and numeric account IDs
      const normalizedSelected = selectedAccount ? selectedAccount.replace(/^act_/i, '') : '';
      const matchAccount = !selectedAccount ||
        d.account_id === selectedAccount ||
        d.account_id === normalizedSelected ||
        d.account_name === selectedAccount;

      return matchFranchise && matchAccount;
    });
  }, [selectedFranchise, selectedAccount, data]);

  const comparisonData = useMemo(() => {
    return formattedComparisonData.filter(d => {
      const matchFranchise = !selectedFranchise || d.franqueado === selectedFranchise;

      // Handle both 'act_' prefixed and numeric account IDs
      const normalizedSelected = selectedAccount ? selectedAccount.replace(/^act_/i, '') : '';
      const matchAccount = !selectedAccount ||
        d.account_id === selectedAccount ||
        d.account_id === normalizedSelected ||
        d.account_name === selectedAccount;

      return matchFranchise && matchAccount;
    });
  }, [selectedFranchise, selectedAccount, formattedComparisonData]);

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
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <aside className="hidden lg:flex w-72 flex-col border-r bg-card h-full">
        <Sidebar activeView={activeView} setActiveView={setActiveView} isDemoMode={isDemoMode} userRole={userProfile?.role} userName={userProfile?.name} userEmail={userProfile?.email} className="border-none h-full" />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden h-full">
        <header className="relative z-50 flex-none">
          <div className="lg:hidden p-4 bg-white border-b flex items-center justify-between">
            <MobileNav activeView={activeView} setActiveView={setActiveView} isDemoMode={isDemoMode} />
            <span className="font-bold">OP7 PERFORMANCE</span>
          </div>
          {activeView === 'settings' ? (
            <div className="h-20 flex items-center px-6 bg-white border-b border-slate-200 shadow-sm relative z-40">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Configurações</h2>
            </div>
          ) : (
            <DashboardHeader
              title={activeView === 'dashboard' ? 'Visão Gerencial' : activeView === 'summary' ? 'Resumo Gerencial' : activeView === 'executive' ? 'Visão Executiva' : activeView === 'campaigns' ? 'Performance de Campanhas' : activeView === 'creatives' ? 'Galeria de Criativos' : activeView === 'ads' ? 'Detalhamento de Anúncios' : activeView === 'demographics' ? 'Inteligência de Público' : activeView === 'planning' ? 'Planejamento Analítico' : 'Dashboard'}
              data={data}
              selectedFranchisee={selectedFranchise}
              setSelectedFranchisee={setSelectedFranchise}
              selectedClient={selectedAccount}
              setSelectedClient={setSelectedAccount}
              dateRange={dateRange}
              setDateRange={setDateRange}
              isLocked={availableFranchises.length === 1 && userProfile?.role !== 'admin'}
              availableFranchises={availableFranchises}
              metaAccounts={metaAccounts}
              userRole={userProfile?.role}
              assignedAccountIds={userProfile?.assigned_account_ids}
            />
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-10">
            {isDemoMode && connectionError && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">Atenção: Modo Offline. Exibindo dados de exemplo.</div>}

            {activeView === 'summary' && (
              <SummaryView
                data={filteredData}
                selectedFranchisee={selectedFranchise}
                selectedClient={selectedAccount}
                dateRange={dateRange}
                allowedFranchises={availableFranchises.map(f => f.name)}
                allowedAccounts={userProfile?.assigned_account_ids}
                externalSummaryData={summaryData}
                externalLoading={loading && !isDataLoaded}
              />
            )}
            {activeView === 'planning' && <PlanningDashboardView allowedFranchises={availableFranchises.map(f => f.name)} userRole={userProfile?.role} />}
            {activeView === 'dashboard' && (
              <ManagerialView
                data={filteredData}
                comparisonData={comparisonData}
                kpiData={kpiRpcData}
                selectedFranchisee={selectedFranchise}
                selectedClient={selectedAccount}
                externalTotalBalance={currentFilteredBalance}
              />
            )}
            {activeView === 'executive' && <DashboardOverview data={filteredData} />}
            {activeView === 'campaigns' && <CampaignsView data={filteredData} />}
            {activeView === 'ads' && (
              <AdsTableView
                data={filteredData}
                onCampaignClick={(campaignName) => {
                  setActiveView('campaigns');
                  // Note: CampaignsView will need to be updated to accept and use this filter
                }}
              />
            )}
            {activeView === 'creatives' && <CreativesView data={filteredData} />}
            {activeView === 'demographics' && <DemographicsGeoView data={filteredData} />}
            {activeView === 'settings' && (userProfile?.role === 'admin' || userProfile?.role === 'executive') ? <SettingsView userRole={userProfile?.role} /> : activeView === 'settings' && (
              <div className="flex h-[60vh] w-full items-center justify-center">
                <div className="flex max-w-md flex-col items-center text-center gap-4 p-8 bg-white rounded-2xl border border-slate-200">
                  <Shield className="h-12 w-12 text-red-500 bg-red-50 p-3 rounded-full mb-2" />
                  <h3 className="text-xl font-bold text-slate-900">Acesso Restrito</h3>
                  <p className="text-slate-500">Seu perfil ({userProfile?.role}) não possui permissão para acessar as configurações.</p>
                  <button onClick={() => setActiveView('dashboard')} className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg">Voltar ao Dashboard</button>
                </div>
              </div>
            )}

            <footer className="text-center text-muted-foreground text-xs py-8">&copy; {new Date().getFullYear()} OP7 Performance.</footer>
          </div>
        </main>
      </div>
    </div>
  );
}