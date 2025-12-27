// app/page.tsx
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Eye,
  BarChart3,
  FileSpreadsheet,
  Zap,
  Check,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Marcaí – Agendamentos e financeiro em um só lugar",
  description:
    "Organize seus agendamentos e acompanhe seu faturamento sem planilhas e sem mensagens.",
};

export default function Home() {
  return (
    <div className={`${inter.className} bg-white text-slate-900`}>
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Marcaí
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#" className="hover:text-slate-900 transition">
              Home
            </Link>
            <Link href="#features" className="hover:text-slate-900 transition">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="hover:text-slate-900 transition">
              Planos
            </Link>
            <Link href="#faq" className="hover:text-slate-900 transition">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ===== HERO ===== */}
        <section className="bg-slate-950 text-white py-28 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="inline-block mb-6 text-xs font-semibold tracking-widest text-slate-400">
                AGENDAMENTO + FINANCEIRO
              </span>

              <h1 className="text-4xl md:text-5xl xl:text-6xl font-semibold leading-tight mb-6">
                Agendamentos organizados.
                <span className="block text-slate-400">
                  Financeiro sob controle.
                </span>
              </h1>

              <p className="text-lg text-slate-300 max-w-xl mb-10">
                Clientes escolhem horários e serviços.
                Você acompanha atendimentos, valores e faturamento
                em um só lugar.
              </p>

              <div className="flex items-center gap-6">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Criar agenda gratuita
                  <ArrowRight size={18} />
                </Link>
                <span className="text-sm text-slate-400">
                  3 meses grátis • Sem cartão
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section id="features" className="py-28 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="mb-20 max-w-2xl">
              <span className="text-xs font-semibold tracking-widest text-slate-500">
                FUNCIONALIDADES
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4 mb-6">
                Tudo para organizar seus atendimentos
              </h2>
              <p className="text-lg text-slate-600">
                Agendamento automático, controle financeiro
                e relatórios simples.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[
                {
                  icon: Calendar,
                  title: "Agendamento por link",
                  desc: "Clientes escolhem horários disponíveis sem trocar mensagens.",
                },
                {
                  icon: Clock,
                  title: "Serviços com tempo e valor",
                  desc: "Defina duração e preço de cada atendimento.",
                },
                {
                  icon: Eye,
                  title: "Visão clara do dia",
                  desc: "Veja atendimentos e ganhos do dia em segundos.",
                },
                {
                  icon: BarChart3,
                  title: "Controle financeiro",
                  desc: "Acompanhe faturamento diário, semanal e mensal.",
                },
                {
                  icon: FileSpreadsheet,
                  title: "Relatórios simples",
                  desc: "Exporte relatórios e saiba quanto você faturou.",
                },
                {
                  icon: Zap,
                  title: "Pronto em minutos",
                  desc: "Crie sua conta e comece a usar sem complicação.",
                },
              ].map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="border-t pt-6 border-slate-200">
                  <Icon className="w-6 h-6 text-slate-900 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="pricing" className="py-28 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <span className="text-xs font-semibold tracking-widest text-slate-500">
                PLANOS
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4">
                Um plano para cada fase do seu negócio
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="border rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-2">Grátis</h3>
                <div className="text-3xl font-semibold mb-6">R$ 0</div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex gap-2"><Check size={16}/>Até 30 agendamentos/mês</li>
                  <li className="flex gap-2"><Check size={16}/>1 profissional</li>
                </ul>
                <Link href="/auth/signup" className="block text-center border rounded-xl py-3">
                  Começar grátis
                </Link>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-8 scale-105">
                <h3 className="text-lg font-semibold mb-2">Profissional ⭐</h3>
                <div className="text-3xl font-semibold mb-6">
                  R$ 39<span className="text-base">/mês</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  <li className="flex gap-2"><Check size={16}/>Agendamentos ilimitados</li>
                  <li className="flex gap-2"><Check size={16}/>Relatórios financeiros</li>
                  <li className="flex gap-2"><Check size={16}/>Suporte prioritário</li>
                </ul>
                <Link href="/auth/signup" className="block text-center bg-white text-slate-900 rounded-xl py-3 font-semibold">
                  Começar teste grátis
                </Link>
              </div>

              <div className="border rounded-2xl p-8">
                <h3 className="text-lg font-semibold mb-2">Equipe</h3>
                <div className="text-3xl font-semibold mb-6">
                  R$ 79<span className="text-base">/mês</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex gap-2"><Check size={16}/>Até 5 profissionais</li>
                  <li className="flex gap-2"><Check size={16}/>Financeiro consolidado</li>
                  <li className="flex gap-2"><Check size={16}/>Permissões por usuário</li>
                </ul>
                <Link href="/auth/signup" className="block text-center border rounded-xl py-3">
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ COMPLETO ===== */}
        <section id="faq" className="py-28 px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-xs font-semibold tracking-widest text-slate-500">
                DÚVIDAS FREQUENTES
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold mt-4">
                Perguntas comuns sobre o Marcaí
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Preciso instalar algo para usar o Marcaí?",
                  a: "Não. O Marcaí funciona 100% online, direto no navegador do celular ou computador.",
                },
                {
                  q: "Meus clientes precisam criar conta?",
                  a: "Não. Eles apenas acessam seu link, escolhem o horário e confirmam o agendamento.",
                },
                {
                  q: "O Marcaí cobra comissão por agendamento?",
                  a: "Não. Você paga apenas o valor do plano, sem taxas por atendimento.",
                },
                {
                  q: "Posso cadastrar quantos serviços quiser?",
                  a: "Sim. Nos planos pagos, você pode criar serviços ilimitados com duração e valor diferentes.",
                },
                {
                  q: "Consigo acompanhar quanto vou ganhar no dia?",
                  a: "Sim. O painel mostra o total do dia, semana e mês automaticamente.",
                },
                {
                  q: "Posso cancelar quando quiser?",
                  a: "Sim. Não há fidelidade. Você pode cancelar a qualquer momento.",
                },
                {
                  q: "O Marcaí é indicado para qual tipo de negócio?",
                  a: "Para profissionais autônomos e negócios de atendimento como barbearias, salões, clínicas, estética e similares.",
                },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group border border-slate-200 rounded-xl p-6"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium">
                    {item.q}
                    <span className="transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="bg-slate-950 text-white py-28 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">
              Comece hoje mesmo
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Teste o plano profissional por 3 meses grátis.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-3 px-10 py-4 bg-white text-slate-950 font-semibold rounded-xl"
            >
              Criar conta gratuita
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm">
          © {new Date().getFullYear()} Marcaí. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
