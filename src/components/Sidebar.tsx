"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Zap,
  Send,
  MessageSquare,
  Play,
  Workflow,
  Settings,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Painel de Controle", icon: LayoutDashboard },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/campaigns", label: "Campanhas", icon: Zap },
  { href: "/broadcasts", label: "Transmissão", icon: Send },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/automation", label: "Automação", icon: Play },
  { href: "/flows", label: "Fluxos de conversa", icon: Workflow },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/templates", label: "Modelos", icon: LayoutGrid },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // lembra a preferência entre navegações
  useEffect(() => {
    const saved = localStorage.getItem("cf-sidebar-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("cf-sidebar-collapsed", v ? "0" : "1");
      return !v;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-gray-100 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* logo + toggle */}
      <div className={cn("flex items-center py-5", collapsed ? "justify-center px-0" : "justify-between px-6")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-accent-green text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">conversaflow</span>
          </div>
        )}
        <button
          onClick={toggle}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-gray-100 hover:text-ink"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className={cn("flex-1 space-y-1 py-2", collapsed ? "px-2" : "px-3")}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "nav-item",
                active && "nav-item-active",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className={cn("flex items-center gap-2 border-t border-gray-100 py-4", collapsed ? "justify-center px-0" : "px-4")}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent-green" />
        {!collapsed && (
          <div className="min-w-0 flex-1 text-xs leading-tight">
            <p className="truncate font-medium text-ink">Companhia 207554</p>
            <p className="text-ink-faint">ID 207554</p>
          </div>
        )}
        <button onClick={logout} title="Sair" className="shrink-0 text-ink-faint transition hover:text-red-500">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </aside>
  );
}
