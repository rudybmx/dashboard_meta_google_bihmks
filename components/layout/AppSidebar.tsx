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
import { ChevronRight, LogOut, LayoutDashboard, PieChart, Users, Settings2, ClipboardList, LayoutGrid, Palette } from "lucide-react";
import { cn } from "@/src/shared/lib/utils";
import { useAuth } from "@/src/auth/useAuth";

const NAV_CONFIG = [
  {
    group: "Campanhas",
    items: [
      {
        id: "meta",
        label: "Meta",
        icon: ({ className }: { className?: string }) => (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        ),
        comingSoon: false,
        children: [
          { label: "Resumo Gerencial", view: "summary", icon: ClipboardList },
          { label: "Visão Gerencial", view: "dashboard", icon: LayoutDashboard },
          { label: "Campanhas", view: "campaigns", icon: PieChart },
          { label: "Anúncios", view: "ads", icon: LayoutGrid },
          { label: "Criativos", view: "creatives", icon: Palette },
          { label: "Públicos", view: "demographics", icon: Users },
        ]
      },
      {
        id: "google",
        label: "Google Ads",
        icon: ({ className }: { className?: string }) => (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        ),
        comingSoon: true,
        children: [
          { label: "Resumo Gerencial", view: null },
          { label: "Visão Gerencial", view: null },
          { label: "Campanhas", view: null },
        ]
      },
      {
        id: "crm",
        label: "CRM",
        icon: ({ className }: { className?: string }) => (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        ),
        comingSoon: true,
        children: [
          { label: "Atendimentos", view: null },
          { label: "Painéis", view: null },
          { label: "Contatos", view: null },
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
      <SidebarHeader className="px-4 py-5 border-b border-white/10">
        <img
          src="https://pub-db8ed4fb33634589a6ce5fb07e85cb46.r2.dev/logo/bihmks/logo_bihmks_branco.svg"
          alt="Bihmks"
          className="h-8 w-auto object-contain"
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
