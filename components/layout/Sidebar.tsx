import React from 'react';
import { LayoutDashboard, PieChart, Users, Settings, Database, AlertCircle, Palette, LineChart, LayoutGrid, ClipboardList } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeView: 'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary';
  setActiveView: (view: 'dashboard' | 'settings' | 'campaigns' | 'creatives' | 'executive' | 'demographics' | 'ads' | 'summary') => void;
  isDemoMode: boolean;
  className?: string;
}

export function Sidebar({ className, activeView, setActiveView, isDemoMode }: SidebarProps) {
  const NavItem = ({ icon: Icon, label, view }: any) => (
    <Button
      variant={activeView === view ? "secondary" : "ghost"}
      className={cn("w-full justify-start gap-3", activeView === view && "bg-secondary text-primary font-semibold")}
      onClick={() => view && setActiveView(view)}
    >
      <Icon size={20} />
      {label}
    </Button>
  );

  return (
    <div className={cn("flex flex-col h-full bg-card border-r py-6 px-4", className)}>
      <div className="mb-8 px-2">
        <h1 className="text-xl font-bold tracking-tight text-primary">OP7 Performance</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem icon={ClipboardList} label="Resumo Gerencial" view="summary" />
        <NavItem icon={LayoutDashboard} label="Visão Gerencial" view="dashboard" />
        <NavItem icon={LineChart} label="Visão Executiva" view="executive" />
        <NavItem icon={PieChart} label="Campanhas" view="campaigns" />
        <NavItem icon={LayoutGrid} label="Anúncios (Tabela)" view="ads" />
        <NavItem icon={Palette} label="Criativos (Galeria)" view="creatives" />
        <NavItem icon={Users} label="Públicos" view="demographics" />
        <NavItem icon={Settings} label="Configurações" view="settings" />
      </nav>

      <div className="mt-auto pt-6 border-t">
        <div className={cn("rounded-lg p-3 text-xs border", isDemoMode ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {isDemoMode ? <AlertCircle size={14} /> : <Database size={14} />}
            {isDemoMode ? "Modo Demo" : "Supabase ON"}
          </div>
          {isDemoMode ? "Visualizando dados fictícios." : "Sincronização em tempo real."}
        </div>
      </div>
    </div>
  );
}
