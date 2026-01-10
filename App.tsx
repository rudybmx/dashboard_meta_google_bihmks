import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  Settings, 
  Users, 
  Menu,
  Loader2,
  Database,
  AlertCircle
} from 'lucide-react';
import { DashboardHeader } from './components/DashboardHeader';
import { ManagerialView } from './components/ManagerialView';
import { AccountsConfig } from './components/AccountsConfig'; // Keeping for reference or fallback? User asked to create THE view. 
// I will replace usage.
import { SettingsView } from './components/SettingsView';
import { fetchCampaignData, fetchFranchises } from './services/supabaseService';
import { CampaignData, Franchise } from './types';

// Simulating "Today" as Dec 22, 2025 to match the dataset typical range
const REFERENCE_DATE = new Date(); // Use current date

const App: React.FC = () => {
  const [data, setData] = useState<CampaignData[]>([]);
  const [officialFranchises, setOfficialFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Navigation State
  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>('dashboard');

  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last-30');
  
  // Custom Date State
  const [customStartDate, setCustomStartDate] = useState<string>('2025-12-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2025-12-31');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch Data Effect
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
        // This catch block shouldn't theoretically be reached due to the robust service try/catch
        console.error("Critical Failure:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Extract unique franchises for the dropdown (now from official list)
  const franchises = useMemo(() => {
    // Only show active franchises that have names
    return officialFranchises
        .filter(f => f.active !== false) // Handle optional active flag (default true if undefined, but explicit false is hidden)
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

  // Logic to calculate previous period data for comparison
  const comparisonData = useMemo(() => {
    // 1. Calculate Previous Date Range
    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;
    
    // Helper to shift date back by 1 month
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
         // Previous of last month = 2 months ago
         const startOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
         const endOfLastMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 0);
         prevStart = subMonth(startOfLastMonth);
         prevEnd = subMonth(endOfLastMonth);
    }

    if (!prevStart || !prevEnd || selectedDateRange === 'all') return [];

    // 2. Filter Data for Previous Range
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
      <div className="flex min-h-screen bg-slate-50 items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-500 font-medium">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 shadow-2xl shadow-indigo-500/5 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex h-full flex-col p-6">
          <div className="px-2 mb-10">
            <img src="/logo.jpg" alt="OP7 Performance" className="w-full h-auto object-contain rounded-xl" />
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem 
                icon={<LayoutDashboard size={20} />} 
                label="Visão Gerencial" 
                active={activeView === 'dashboard'} 
                onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
            />
            <SidebarItem icon={<PieChartIcon size={20} />} label="Campanhas" />
            <SidebarItem icon={<Users size={20} />} label="Públicos" />
            
            <SidebarItem 
                icon={<Settings size={20} />} 
                label="Configurações" 
                active={activeView === 'settings'}
                onClick={() => { setActiveView('settings'); setIsMobileMenuOpen(false); }}
            />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            {isDemoMode ? (
                 <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-4">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
                        <AlertCircle size={14} />
                        <span>Modo Demonstração</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                        Banco de dados inacessível. Visualizando dados fictícios.
                    </p>
                 </div>
            ) : (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mb-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1">
                        <Database size={14} />
                        <span>Supabase Conectado</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 leading-relaxed">
                        Dados sincronizados em tempo real.
                    </p>
                </div>
            )}


          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 flex flex-col">
        {/* Banner de Erro de Conexão (Visível apenas em modo demo por erro) */}
        {isDemoMode && connectionError && (
            <div className="bg-red-500 text-white text-xs font-semibold py-2 px-6 text-center shadow-sm">
                Atenção: Não foi possível conectar ao Supabase ({connectionError}). Exibindo dados de exemplo.
            </div>
        )}

        <header className="sticky top-0 z-30 flex flex-col md:flex-row h-auto items-start md:items-center gap-4 bg-slate-50/90 px-6 py-4 backdrop-blur-md transition-all border-b border-slate-200/50">
          <div className="flex w-full md:w-auto items-center justify-between">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
            >
                <Menu size={24} />
            </button>
            <div className="md:hidden">
                <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    AU
                </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            {/* Show Filters only on Dashboard View */}
            {activeView === 'dashboard' ? (
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
            ) : (
                <div className="flex items-center text-slate-400 font-medium">
                    <Settings className="mr-2" size={18} />
                    Área Administrativa
                </div>
            )}
          </div>
          
          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-slate-200 ml-2">
             <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900">Usuário Admin</span>
                <span className="text-xs text-slate-500">Super Admin</span>
             </div>
             <div className="h-10 w-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold">
                AU
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 space-y-8">
          
          {activeView === 'dashboard' ? (
              <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900">Performance Gerencial</h2>
                    <span className="text-xs font-medium bg-slate-200 text-slate-600 px-3 py-1 rounded-full">
                        {getDateLabel()}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mb-6">Visão estratégica de funil e criativos para tomada de decisão rápida.</p>
                
                <ManagerialView data={filteredData} comparisonData={comparisonData} />
              </section>
          ) : (
              <SettingsView />
          )}

          <footer className="text-center text-slate-400 text-sm py-8">
            &copy; {new Date().getFullYear()} OP7 Performance. Todos os direitos reservados.
          </footer>
        </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`
    w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group
    ${active 
      ? 'bg-indigo-50 text-indigo-600 shadow-sm font-semibold' 
      : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-md hover:shadow-slate-200/50 font-medium'
    }
  `}>
    <span className={active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}>
      {icon}
    </span>
    {label}
  </button>
);

export default App;