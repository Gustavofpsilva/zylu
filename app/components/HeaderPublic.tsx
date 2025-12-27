"use client";

import Link from "next/link";

export default function HeaderPublic() {
  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-semibold text-slate-900">
          Marcaí
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Entrar
          </Link>

          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
