"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, LogOut, PieChart, Users, Settings2, ClipboardList, LayoutGrid, Palette, TrendingUp, Megaphone, BarChart2, Layers, Type, FileText } from "lucide-react";
import { cn } from "@/src/shared/lib/utils";
import { useAuth } from "@/src/auth/useAuth";

const NAV_CONFIG = [
  {
    group: "Campanhas",
    items: [
      {
        id: "meta",
        label: "Meta Ads",
        icon: TrendingUp,
        comingSoon: false,
        children: [
          { label: "Resumo Gerencial", view: "summary", icon: ClipboardList },
          { label: "Visão Gerencial", view: "executive", icon: TrendingUp },
          { label: "Campanhas", view: "campaigns", icon: PieChart },
          { label: "Anúncios", view: "ads", icon: LayoutGrid },
          { label: "Criativos", view: "creatives", icon: Palette },
          { label: "Públicos", view: "demographics", icon: Users },
        ]
      },
      {
        id: "google",
        label: "Google Ads",
        icon: Megaphone,
        comingSoon: false,
        children: [
          { label: "Visão Geral", view: "google_overview", icon: BarChart2 },
          { label: "Campanhas", view: "google_campaigns", icon: PieChart },
          { label: "Grupos de Anúncios", view: "google_adgroups", icon: Layers },
          { label: "Palavras-chave", view: "google_keywords", icon: Type },
          { label: "Anúncios", view: "google_ads", icon: FileText },
          { label: "Públicos", view: "google_audiences", icon: Users },
        ]
      },
    ]
  },
  {
    group: "Configurações",
    adminOnly: true,
    items: [
      {
        id: "settings",
        label: "Configurações",
        icon: Settings2,
        comingSoon: false,
        children: [
          { label: "Contas de Anúncios", view: "settings_accounts", icon: Settings2 },
          { label: "Usuários e Acessos", view: "settings_users", icon: Users },
        ]
      }
    ]
  }
];

interface AppSidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function AppSidebar({ activeView, setActiveView, userRole, userName, userEmail }: AppSidebarProps) {
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="none" className="bg-black border-r border-white/10">
      <SidebarHeader className="px-4 py-8 border-b border-white/10">
        <img
          src="https://pub-db8ed4fb33634589a6ce5fb07e85cb46.r2.dev/logo/bihmks/logo_bihmks_branco.svg"
          alt="Bihmks"
          className="h-16 w-auto object-contain"
        />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {NAV_CONFIG.map((group) => {
          if (group.adminOnly && userRole !== 'admin' && userRole !== 'executive') return null;

          return (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel className="text-white/40 text-[10px] uppercase tracking-widest px-2 mb-1">
                {group.group}
              </SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <Collapsible key={item.id} defaultOpen={item.id === "meta"} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="text-white/70 hover:text-white hover:bg-white/10 data-[active=true]:bg-white/15 data-[active=true]:text-white">
                          {typeof item.icon === 'function' ? (
                            <item.icon className="size-4" />
                          ) : (
                            <item.icon className="size-4" />
                          )}
                          <span>{item.label}</span>
                          {item.comingSoon && (
                            <span className="ml-auto text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">
                              Em breve
                            </span>
                          )}
                          {!item.comingSoon && (
                            <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-white/10 ml-3 pl-3">
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.label}>
                              <SidebarMenuSubButton
                                isActive={activeView === child.view}
                                onClick={() => child.view && !item.comingSoon && setActiveView(child.view)}
                                className={cn(
                                  "text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
                                  item.comingSoon && "cursor-default opacity-40 pointer-events-none",
                                  activeView === child.view && "text-white bg-white/15 font-medium"
                                )}
                              >
                                {child.icon && <child.icon className="size-3.5" />}
                                <span>{child.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>

                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-white/80">{userName}</span>
            <span className="truncate text-[10px] text-white/40">{userEmail}</span>
          </div>
          <button
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Sair"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SidebarProvider, SidebarTrigger };
