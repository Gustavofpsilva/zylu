// app/app/components/MobileHeader.tsx
"use client";

type Props = {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onLogout?: () => void;
};

export function MobileHeader({
  title,
  subtitle,
  onMenuClick,
  onLogout,
}: Props) {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-30 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-4">
        {/* Menu */}
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white"
          aria-label="Abrir menu"
        >
          ☰
        </button>

        {/* Title */}
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          )}
        </div>

        {/* Right action */}
        {onLogout ? (
          <button
            onClick={onLogout}
            className="text-[11px] text-slate-600 hover:text-red-600"
          >
            Sair
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}
