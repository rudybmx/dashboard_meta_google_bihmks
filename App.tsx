import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DashboardHeader } from './components/DashboardHeader';
import { ManagerialView } from './components/ManagerialView';
import { SettingsView } from './components/SettingsView';
import { fetchCampaignData, fetchFranchises } from './services/supabaseService';
import { CampaignData, Franchise } from './types';
import { Loader2 } from 'lucide-react';

const REFERENCE_DATE = new Date();

export default function App() {
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>('dashboard');

  // Estados de Filtro
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last-30');
  const [customStartDate, setCustomStartDate] = useState<string>('2025-12-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2025-12-31');

  // Data Fetching
  useEffect(() => {
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
  }, []);

  // Extract unique franchises
  const franchises = useMemo(() => {
    return officialFranchises
        .filter(f => f.active !== false)
        .map(f => f.name)
        .sort();
  }, [officialFranchises]);

  // Extract accounts based on selected franchise
  const availableAccounts = useMemo(() => {
    let dataToFilter = data;
    if (selectedFranchise !== 'all') {
      dataToFilter = data.filter(d => d.franqueado === selectedFranchise);
    }
    const unique = new Set(dataToFilter.map(d => d.account_name));
    return Array.from(unique).sort();
  }, [selectedFranchise, data]);

  // Reset account selection when franchise changes
  useEffect(() => {
    setSelectedAccount('all');
  }, [selectedFranchise]);

  // Filter data based on selection (Franchise, Account, Date)
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchFranchise = selectedFranchise === 'all' || d.franqueado === selectedFranchise;
      const matchAccount = selectedAccount === 'all' || d.account_name === selectedAccount;
      
      // Date Filtering
      let matchDate = true;
      const itemDate = new Date(d.date_start + 'T12:00:00'); 
      const refDate = new Date(REFERENCE_DATE); 
      
      if (selectedDateRange === 'custom') {
        if (customStartDate && customEndDate) {
            const start = new Date(customStartDate + 'T00:00:00');
            const end = new Date(customEndDate + 'T23:59:59');
            matchDate = itemDate >= start && itemDate <= end;
        }
      } else if (selectedDateRange === 'last-7') {
        const pastDate = new Date(refDate);
        pastDate.setDate(refDate.getDate() - 7);
        matchDate = itemDate >= pastDate && itemDate <= refDate;
      } else if (selectedDateRange === 'last-30') {
        const pastDate = new Date(refDate);
        pastDate.setDate(refDate.getDate() - 30);
        matchDate = itemDate >= pastDate && itemDate <= refDate;
      } else if (selectedDateRange === 'this-week') {
        const startOfWeek = new Date(refDate);
        startOfWeek.setDate(refDate.getDate() - refDate.getDay());
        matchDate = itemDate >= startOfWeek && itemDate <= refDate;
      } else if (selectedDateRange === 'last-week') {
        const startOfLastWeek = new Date(refDate);
        startOfLastWeek.setDate(refDate.getDate() - refDate.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        matchDate = itemDate >= startOfLastWeek && itemDate <= endOfLastWeek;
      } else if (selectedDateRange === 'this-month') {
        const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        matchDate = itemDate >= startOfMonth && itemDate <= refDate;
      } else if (selectedDateRange === 'last-month') {
        const startOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
        matchDate = itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
      }

      return matchFranchise && matchAccount && matchDate;
    });
  }, [selectedFranchise, selectedAccount, selectedDateRange, customStartDate, customEndDate, data]);

  // Comparison Data Logic
  const comparisonData = useMemo(() => {
    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;
    
    const subMonth = (d: Date) => {
        const newDate = new Date(d);
        newDate.setMonth(d.getMonth() - 1);
        return newDate;
    };

    const refDate = new Date(REFERENCE_DATE);

    if (selectedDateRange === 'custom') {
        if (customStartDate && customEndDate) {
            prevStart = subMonth(new Date(customStartDate + 'T00:00:00'));
            prevEnd = subMonth(new Date(customEndDate + 'T23:59:59'));
        }
    } else if (selectedDateRange === 'last-7') {
        const currentEnd = new Date(refDate);
        const currentStart = new Date(refDate);
        currentStart.setDate(refDate.getDate() - 7);
        prevStart = subMonth(currentStart);
        prevEnd = subMonth(currentEnd);
    } else if (selectedDateRange === 'last-30') {
        const currentEnd = new Date(refDate);
        const currentStart = new Date(refDate);
        currentStart.setDate(refDate.getDate() - 30);
        prevStart = subMonth(currentStart);
        prevEnd = subMonth(currentEnd);
    } else if (selectedDateRange === 'this-week') {
         const startOfWeek = new Date(refDate);
         startOfWeek.setDate(refDate.getDate() - refDate.getDay());
         prevStart = subMonth(startOfWeek);
         prevEnd = subMonth(refDate);
    } else if (selectedDateRange === 'last-week') {
         const startOfLastWeek = new Date(refDate);
         startOfLastWeek.setDate(refDate.getDate() - refDate.getDay() - 7);
         const endOfLastWeek = new Date(startOfLastWeek);
         endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
         prevStart = subMonth(startOfLastWeek);
         prevEnd = subMonth(endOfLastWeek);
    } else if (selectedDateRange === 'this-month') {
         const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
         prevStart = subMonth(startOfMonth);
         prevEnd = subMonth(refDate);
    } else if (selectedDateRange === 'last-month') {
         const startOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
         const endOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
         prevStart = subMonth(startOfLastMonth);
         prevEnd = subMonth(endOfLastMonth);
    }

    if (!prevStart || !prevEnd || selectedDateRange === 'all') return [];

    return data.filter(d => {
       const matchFranchise = selectedFranchise === 'all' || d.franqueado === selectedFranchise;
       const matchAccount = selectedAccount === 'all' || d.account_name === selectedAccount;
       const itemDate = new Date(d.date_start + 'T12:00:00');
       const matchDate = itemDate >= prevStart! && itemDate <= prevEnd!;
       return matchFranchise && matchAccount && matchDate;
    });
  }, [selectedFranchise, selectedAccount, selectedDateRange, customStartDate, customEndDate, data]);

  const getDateLabel = () => {
    switch(selectedDateRange) {
      case 'custom':
        const start = customStartDate ? new Date(customStartDate + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : '...';
        const end = customEndDate ? new Date(customEndDate + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year:'2-digit'}) : '...';
        return `${start} - ${end}`;
      case 'last-7': return 'Últimos 7 Dias';
      case 'last-30': return 'Últimos 30 Dias';
      case 'this-week': return 'Esta Semana';
      case 'last-week': return 'Semana Passada';
      case 'this-month': return 'Este Mês';
      case 'last-month': return 'Mês Passado';
      case 'all': return 'Todo o Período';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-muted-foreground font-medium">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      
      {/* 1. SIDEBAR DESKTOP (O FIX ESTÁ AQUI) */}
      <div className="hidden lg:flex w-72 flex-col fixed inset-y-0 z-50 border-r bg-card">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isDemoMode={isDemoMode} 
          className="border-none"
        />
      </div>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-6 gap-4 bg-background/80 backdrop-blur-md border-b">
          <MobileNav activeView={activeView} setActiveView={setActiveView} isDemoMode={isDemoMode} />
          
          <div className="flex-1">
             {activeView === 'dashboard' ? (
                <div className="flex items-center justify-between">
                   <h2 className="text-lg font-semibold lg:hidden">OP7 Dashboard</h2>
                   <div className="hidden lg:block w-full">
                       <DashboardHeader 
                          franchises={franchises} 
                          selectedFranchise={selectedFranchise} 
                          onSelectFranchise={setSelectedFranchise}
                          accounts={availableAccounts}
                          selectedAccount={selectedAccount}
                          onSelectAccount={setSelectedAccount}
                          selectedDateRange={selectedDateRange}
                          onSelectDateRange={setSelectedDateRange}
                          customStartDate={customStartDate}
                          onCustomStartDateChange={setCustomStartDate}
                          customEndDate={customEndDate}
                          onCustomEndDateChange={setCustomEndDate}
                        />
                   </div>
                </div>
             ) : (
                <h2 className="text-lg font-semibold">Configurações</h2>
             )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-auto bg-muted/20">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            
            {/* Mobile Header Filter Placeholder if needed, or keeping filters inside header only for simplicity */}
            {activeView === 'dashboard' && (
                <div className="lg:hidden mb-4">
                     <DashboardHeader 
                          franchises={franchises} 
                          selectedFranchise={selectedFranchise} 
                          onSelectFranchise={setSelectedFranchise}
                          accounts={availableAccounts}
                          selectedAccount={selectedAccount}
                          onSelectAccount={setSelectedAccount}
                          selectedDateRange={selectedDateRange}
                          onSelectDateRange={setSelectedDateRange}
                          customStartDate={customStartDate}
                          onCustomStartDateChange={setCustomStartDate}
                          customEndDate={customEndDate}
                          onCustomEndDateChange={setCustomEndDate}
                        />
                </div>
            )}

            {isDemoMode && connectionError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                    Atenção: Modo Offline. Exibindo dados de exemplo. ({connectionError})
                </div>
            )}

            {activeView === 'dashboard' ? (
                <ManagerialView data={filteredData} comparisonData={comparisonData} />
            ) : (
                <SettingsView />
            )}
           
            <footer className="text-center text-muted-foreground text-xs py-8">
              &copy; {new Date().getFullYear()} OP7 Performance.
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}