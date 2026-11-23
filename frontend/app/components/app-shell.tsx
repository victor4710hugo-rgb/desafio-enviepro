
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Clientes", href: "/clientes", icon: "users" },
  { label: "Funil de Vendas", href: "/funil", icon: "funnel" },
  { label: "Vendas", href: "/vendas", icon: "chart" },
];

function Icon({ name }: { name: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "users":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "funnel":
      return <svg {...common}><path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" /></svg>;
    case "chart":
      return <svg {...common}><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "close":
      return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    default:
      return null;
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMenu() {
    setMobileOpen(false);
  }

  return (
    <div className="app-background min-h-screen text-white">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`glass-sidebar fixed inset-y-3 left-3 z-50 flex w-[264px] flex-col rounded-[26px] p-5 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[115%]"
        }`}
      >
        <div className="flex items-center justify-between px-1 pb-9 pt-2">
          <Link href="/" onClick={closeMenu} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-700 shadow-lg shadow-violet-900/40">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-wide text-white">EnviePro</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-violet-200/55">CRM Workspace</p>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/40">
          Menu principal
        </div>

        <nav className="flex flex-col gap-1.5">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "nav-active text-white"
                    : "text-violet-100/60 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {active && <span className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-violet-300 shadow-[0_0_12px_2px_rgba(167,139,250,0.65)]" />}
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 mt-9 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/40">
          Preferências
        </div>
        <Link
          href="/configuracoes"
          onClick={closeMenu}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition ${
            pathname === "/configuracoes"
              ? "nav-active text-white"
              : "text-violet-100/60 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          <Icon name="settings" />
          Configurações
        </Link>

        <div className="mt-auto">
          <div className="mb-4 rounded-2xl border border-violet-300/10 bg-violet-300/[0.06] p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
              <span className="text-[10px] font-medium text-violet-100/60">Sistema operacional</span>
            </div>
            <p className="text-xs font-medium text-white/90">Seu workspace está ativo</p>
          </div>

          <div className="flex items-center gap-3 border-t border-white/[0.08] px-1 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200/20 bg-gradient-to-br from-violet-300/30 to-purple-700/50 text-sm font-semibold text-white">
              EP
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">Administrador</p>
              <p className="mt-0.5 text-[10px] text-violet-100/45">Workspace EnviePro</p>
            </div>
            <span className="text-violet-200/50">•••</span>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[292px]">
        <header className="flex h-[76px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-violet-100 lg:hidden"
            >
              <Icon name="menu" />
            </button>
            <div>
              <p className="text-xs text-violet-200/45">EnviePro CRM</p>
              <p className="text-sm font-medium text-white/90">Painel de gestão</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-violet-100/55">Ambiente conectado</span>
          </div>
        </header>

        <main className="px-5 pb-10 pt-3 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
