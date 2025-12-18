// app/page.tsx
import { Inter } from "next/font/google";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Marcaí – Sua agenda online em um link",
  description: "Agende serviços com facilidade. Sem mensagens, sem confusão. Para profissionais autônomos.",
};

export default function Home() {
  return (
    <div className={inter.className}>
      {/* ===== Header ===== */}
      <header className="w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            Marcaí
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Entrar
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="overflow-hidden">
        {/* ===== Hero ===== */}
        <section className="py-16 md:py-24 lg:py-32 px-4 bg-gradient-to-br from-blue-50 to-indigo-50/30">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full mb-4">
                📅 Nova agenda online para profissionais
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                Organize seus atendimentos
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  sem troca de mensagens
                </span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                Seus clientes escolhem o serviço e o horário disponível. Você recebe tudo organizado — sem confusão, sem perda de tempo.
              </p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition shadow-sm hover:shadow-md"
              >
                Começar grátis
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <p className="text-sm text-slate-500 mt-3">3 meses grátis • Sem cartão</p>
            </div>

            <div className="relative flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute -top-8 -right-8 w-64 h-64 bg-blue-100 rounded-full opacity-30 blur-3xl"></div>
                <div className="relative bg-white rounded-2xl shadow-xl p-5 border border-slate-200">
                  <div className="text-xs text-slate-500 mb-3">Hoje • 10h30</div>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-slate-900">Corte de cabelo</div>
                      <div className="text-xs text-slate-500">R$ 80</div>
                      <div className="text-sm text-slate-700 mt-1">👩‍🦱 Mariana</div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 my-3"></div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div>
                      <div className="font-medium text-slate-900">Barba + sobrancelha</div>
                      <div className="text-xs text-slate-500">R$ 60</div>
                      <div className="text-sm text-slate-700 mt-1">👨‍🦱 Lucas</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section id="features" className="py-20 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full mb-4">
                FUNCIONALIDADES
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Tudo em um só lugar
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Agenda, serviços e controle financeiro — simples, rápido e feito para você.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: "📅", title: "Agenda online por link", desc: "Compartilhe um link único com seus clientes e deixe que eles escolham o melhor horário disponível." },
                { icon: "💰", title: "Serviços com duração e preço", desc: "Cadastre seus serviços, defina o tempo de atendimento e o valor cobrado por cada um." },
                { icon: "👁️", title: "Visual claro do dia", desc: "Veja todos os atendimentos organizados por horário, com nome do cliente e serviço escolhido." },
                { icon: "📊", title: "Controle de valores recebidos", desc: "Acompanhe quanto entrou hoje, essa semana ou esse mês, de forma simples e organizada." },
                { icon: "📤", title: "Relatórios e planilhas", desc: "Visualize gráficos simples e exporte planilhas para ter mais clareza sobre seu faturamento." },
                { icon: "⚡", title: "Simples de usar", desc: "Sem configurações complicadas. Crie sua conta, cadastre seus serviços e comece a usar." },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4 text-xl">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA Final ===== */}
        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para organizar seus atendimentos?
            </h2>
            <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
              Crie sua conta, cadastre seus serviços e comece a usar hoje mesmo — grátis por 3 meses.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-slate-100 transition shadow-lg"
            >
              Criar conta grátis
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <p className="text-blue-200 mt-4 text-sm">Sem cartão • Em poucos minutos</p>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-4">
            <Link href="/" className="text-white text-xl font-bold">
              Marcaí
            </Link>
          </div>
          <p className="mb-4">Sua agenda online em um link.</p>
          <div className="flex justify-center gap-6 mb-6">
            <a href="mailto:contato@marcai.com.br" className="hover:text-white transition">
              contato@marcai.com.br
            </a>
            <a href="tel:+5545991292661" className="hover:text-white transition">
              (45) 99129-2661
            </a>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} Marcaí. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}