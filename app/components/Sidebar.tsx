"use client";

import { useRouter, usePathname } from "next/navigation";

type Item = {
  label: string;
  href: string;
};

const items: Item[] = [
  { label: "Dashboard", href: "/app" },
  { label: "Agendamentos", href: "/app/agendamentos" },
  { label: "Serviços", href: "/app/services" },
  { label: "Financeiro", href: "/app/financeiro" },
  { label: "Relatórios", href: "/app/relatorios" }, // ✅ NOVO
];

export default function Sidebar({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const initialLetter = userName.trim().charAt(0).toUpperCase() || "M";

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 px-5 py-6 sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">
          M
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Marcaí</p>
          <p className="text-xs text-slate-500">Painel do profissional</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-1 flex-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition
                ${
                  active
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  active ? "bg-slate-900" : "bg-slate-300"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
          {initialLetter}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-900 truncate">
            {userName}
          </p>
          <p className="text-[11px] text-slate-500">Conta profissional</p>
        </div>
        <button
          onClick={onLogout}
          className="ml-auto text-[11px] text-slate-500 hover:text-red-600"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
