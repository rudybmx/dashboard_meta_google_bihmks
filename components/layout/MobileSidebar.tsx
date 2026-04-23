"use client";

import React, { useState } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, LogOut, TrendingUp, ClipboardList, PieChart, LayoutGrid, Palette, Users, Megaphone, Filter, Video, Sparkles, Settings2 } from "lucide-react";
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
        ],
      },
      {
        id: "google",
        label: "Google Ads",
        icon: Megaphone,
        comingSoon: true,
        children: [],
      },
      {
        id: "linkedin",
        label: "LinkedIn Ads",
        icon: Filter,
        comingSoon: true,
        children: [],
      },
      {
        id: "tiktok",
        label: "TikTok Ads",
        icon: Video,
        comingSoon: true,
        children: [],
      },
    ],
  },
  {
    group: "Inteligência",
    items: [
      {
        id: "ai_insights",
        label: "Insights IA",
        icon: Sparkles,
        comingSoon: false,
        children: [
          { label: "Central de Insights", view: "ai_insights", icon: Sparkles },
        ],
      },
    ],
  },
  {
    group: "Gestão de Leads",
    items: [
      {
        id: "crm",
        label: "CRM",
        icon: ({ className }: { className?: string }) => (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        ),
        comingSoon: true,
        children: [],
      },
      {
        id: "funnel",
        label: "Funil de Leads",
        icon: Filter,
        comingSoon: true,
        children: [],
      },
    ],
  },
];

interface NavItemProps {
  item: (typeof NAV_CONFIG)[0]["items"][0];
  activeView: string;
  onNavigate: (view: string) => void;
  index: number;
}

function NavItem({ item, activeView, onNavigate, index }: NavItemProps) {
  const [open, setOpen] = useState(
    item.id === "meta" || item.children.some((c) => c.view === activeView)
  );
  const Icon = item.icon;
  const hasActiveChild = item.children.some((c) => c.view === activeView);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.04 }}
    >
      <button
        onClick={() => !item.comingSoon && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
          "min-h-[44px] touch-manipulation",
          hasActiveChild
            ? "bg-white/15 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white",
          item.comingSoon && "cursor-default opacity-40"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.comingSoon ? (
          <span className="text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full">
            Em breve
          </span>
        ) : (
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <ChevronRight className="size-3.5 text-white/40" />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !item.comingSoon && item.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-0.5 border-l border-white/10 pl-3 pb-1 space-y-0.5">
              {item.children.map((child) => (
                <button
                  key={child.label}
                  onClick={() => child.view && onNavigate(child.view)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    "min-h-[44px] touch-manipulation",
                    activeView === child.view
                      ? "bg-white/15 text-white font-medium"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  )}
                >
                  {child.icon && <child.icon className="size-3.5 shrink-0" />}
                  <span>{child.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MobileSidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  userRole?: string;
  userName?: string;
  userEmail?: string;
}

export function MobileSidebar({
  activeView,
  setActiveView,
  userRole,
  userName,
  userEmail,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setOpen(false);
  };

  const visibleGroups = NAV_CONFIG.filter((g) => {
    if ((g as any).adminOnly) return userRole === "admin" || userRole === "executive";
    return true;
  });

  return (
    <>
      {/* Hamburger trigger */}
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="flex items-center justify-center rounded-xl bg-white/10 text-white min-h-[44px] min-w-[44px] touch-manipulation"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </motion.button>

      <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
        <Drawer.Portal>
          {/* Overlay */}
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />

          {/* Drawer content */}
          <Drawer.Content
            className={cn(
              "fixed left-0 top-0 bottom-0 z-50 flex flex-col",
              "w-[min(85vw,320px)] bg-black border-r border-white/10",
              "outline-none overflow-hidden"
            )}
            aria-label="Menu de navegação"
          >
            {/* Drag handle (top right) */}
            <div className="absolute right-3 top-3">
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-xl bg-white/10 text-white/60 hover:text-white min-h-[44px] min-w-[44px] touch-manipulation transition-colors"
                aria-label="Fechar menu"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Logo */}
            <div className="px-4 py-6 border-b border-white/10 mt-1">
              <img
                src="https://pub-db8ed4fb33634589a6ce5fb07e85cb46.r2.dev/logo/bihmks/logo_bihmks_branco.svg"
                alt="Bihmks"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-4">
              {visibleGroups.map((group) => (
                <div key={group.group}>
                  <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-white/30 font-medium">
                    {group.group}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item, i) => (
                      <NavItem
                        key={item.id}
                        item={item}
                        activeView={activeView}
                        onNavigate={handleNavigate}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Settings — admin only */}
              {(userRole === "admin" || userRole === "executive") && (
                <div>
                  <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-white/30 font-medium">
                    Configurações
                  </p>
                  <div className="space-y-0.5">
                    <NavItem
                      item={{
                        id: "settings",
                        label: "Configurações",
                        icon: Settings2,
                        comingSoon: false,
                        children: [
                          { label: "Contas de Anúncios", view: "settings_accounts", icon: Settings2 },
                          { label: "Usuários e Acessos", view: "settings_users", icon: Users },
                        ],
                      }}
                      activeView={activeView}
                      onNavigate={handleNavigate}
                      index={0}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-3 py-3">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2.5 min-h-[52px]">
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-xs font-medium text-white/80">{userName}</span>
                  <span className="truncate text-[10px] text-white/40">{userEmail}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors touch-manipulation"
                  title="Sair"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
