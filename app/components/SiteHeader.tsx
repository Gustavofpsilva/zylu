"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SiteHeader() {
  const router = useRouter();

  return (
    <header className="w-full bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-lg font-semibold text-slate-900">
          Marcaí
        </Link>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/auth/login")}
            className="
              px-4 py-2 text-sm
              rounded-full border border-slate-300
              text-slate-700 hover:bg-slate-50
            "
          >
            Entrar
          </button>

          <button
            onClick={() => router.push("/auth/signup")}
            className="
              px-4 py-2 text-sm font-medium
              rounded-full bg-blue-600 text-white
              hover:bg-blue-700
            "
          >
            Criar conta
          </button>
        </div>
      </div>
    </header>
  );
}
