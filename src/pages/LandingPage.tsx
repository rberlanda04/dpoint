import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  QrCode,
  Cloud,
  ArrowRight,
  Zap,
  Shield,
  CheckCircle2,
  Users,
  Globe,
  Lock,
  Clock,
  Share2,
  TrendingUp,
  BarChart3,
  Wallet,
  Building2,
  Briefcase,
  Play,
  Pause,
  Timer,
  Flame,
  Award,
  Sparkles,
  Send,
  ExternalLink,
  ChevronRight,
  Download
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../i18n';
import { usePWAInstall } from '../hooks/usePWAInstall';

// Import images
import img1 from '../imgs/construction-worker-with-document-plan-working-inside-building-construction-site.jpg';
import img2 from '../imgs/front-view-woman-working-as-engineer.jpg';
import img5 from '../imgs/businessmen-hands-white-table-with-documents-drafts.jpg';
import img6 from '../imgs/worker-is-cutting-wires-with-lineman-s-pliers.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { isInstallable, promptInstall } = usePWAInstall();

  // Demo Live Tracker state for the hero widget
  const [demoActive, setDemoActive] = useState(true);
  const [demoSeconds, setDemoSeconds] = useState(5420); // 01:30:20
  const hourlyRate = 35; // R$ 35/h

  useEffect(() => {
    if (!demoActive) return;
    const interval = setInterval(() => {
      setDemoSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [demoActive]);

  const formatDemoTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const demoEarnings = ((demoSeconds / 3600) * hourlyRate).toFixed(2);

  const b2cHighlights = [
    {
      icon: Timer,
      title: 'Relógio de Turno "Strava do Trabalho"',
      description: 'Cronometre seus trabalhos em tempo real com contador dinâmico de ganhos acumulados segundo a segundo.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Share2,
      title: 'Comprovante em 1-Clique para WhatsApp',
      description: 'Envie resumos auditados de turno para seus clientes, contratantes ou equipe com link ou texto formatado.',
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
    },
    {
      icon: Wallet,
      title: 'Painel de Ganhos & Metas',
      description: 'Projeção automática de renda mensal, cálculo de taxa por hora e sequência de dias trabalhados (streaks).',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  const b2bHighlights = [
    {
      icon: Building2,
      title: 'Central de Comando de Obras',
      description: 'Acompanhe todas as suas obras e equipes externas ao vivo em um painel unificado.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: MapPin,
      title: 'Geofencing & Validação GPS',
      description: 'Cerca virtual automática por GPS. Garanta que cada check-in ocorra exatamente dentro do canteiro de obras.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: BarChart3,
      title: 'Relatórios Corporativos & CLT',
      description: 'Exportação imediata de folhas de ponto CSV, horas trabalhadas por equipe e auditoria trabalhista sem complicação.',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-900 tracking-tight">DPoint</span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              O seu Tracker de Trabalho
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isInstallable && (
              <button
                onClick={promptInstall}
                className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-all cursor-pointer border border-emerald-200"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar App
              </button>
            )}
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all cursor-pointer border-0"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border-0"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Dual Value Prop & Live Tracker Widget */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-100 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                Diga olá para a forma mais fácil de acompanhar seu trabalho!
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                O seu tempo importa. <br />
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 bg-clip-text text-transparent">
                  Acompanhe seus ganhos em tempo real.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Criamos o DPoint para ser o seu companheiro diário. Seja você um <strong>profissional autônomo</strong> querendo organizar suas horas, ou uma <strong>empresa</strong> buscando cuidar melhor das equipes em campo de forma simples e transparente.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => navigate('/login?tab=trabalhador')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold px-6 py-4 rounded-2xl text-sm flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/30 hover:-translate-y-0.5 cursor-pointer border-0"
                >
                  <Timer className="w-5 h-5" />
                  Quero acompanhar minhas horas!
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() => navigate('/login')}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 py-4 rounded-2xl text-sm border border-slate-200 transition-all cursor-pointer shadow-sm shadow-slate-200/50"
                >
                  <Building2 className="w-4 h-4 inline mr-2 text-indigo-500" />
                  Sou Empresa / Gestor
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Totalmente Gratuito para Pessoas
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Segurança & Transparência
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  Funciona direto no Celular
                </span>
              </div>
            </div>

            {/* Hero Right: Interactive Live Tracker Demo Card */}
            <div className="lg:col-span-5">
              <div className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Você, Ao Vivo</span>
                  </div>
                  <span className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1 rounded-full font-bold border border-slate-200">
                    Sua Localização Atual
                  </span>
                </div>

                {/* Big Live Timer */}
                <div className="text-center space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Seu tempo dedicado hoje</p>
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                    {formatDemoTimer(demoSeconds)}
                  </div>
                </div>

                {/* Dynamic Earnings Accumulator */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-emerald-700 uppercase font-bold">O que você já ganhou</p>
                    <p className="text-2xl font-extrabold text-emerald-600 font-mono">
                      R$ {demoEarnings}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Sua meta / hora</p>
                    <p className="text-xs font-extrabold text-slate-600">R$ {hourlyRate},00/h</p>
                  </div>
                </div>

                {/* Simulated Control Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setDemoActive(!demoActive)}
                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold py-3 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    {demoActive ? <Pause className="w-4 h-4 text-slate-600" /> : <Play className="w-4 h-4 text-slate-600" />}
                    {demoActive ? 'Descansar um pouco' : 'Voltar à ativa'}
                  </button>

                  <button
                    onClick={() => navigate('/login?tab=trabalhador')}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border-0 shadow-md shadow-emerald-500/20"
                  >
                    <Send className="w-4 h-4" />
                    Salvar e Compartilhar
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[11px] text-slate-400 font-medium">
                    ✨ Crie sua conta para registrar seus próprios ganhos reais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2C Section: Para Trabalhadores & Autônomos */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
              Perfeito para você, trabalhador autônomo
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Sinta-se no controle do seu próprio esforço
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sabemos o quanto você trabalha. O DPoint é a sua ferramenta carinhosa para nunca mais perder a conta de quantas horas você dedicou a um projeto, e mostrar tudo com clareza para seus clientes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {b2cHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                  <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/login?tab=trabalhador')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-4 rounded-2xl text-sm inline-flex items-center gap-2 transition-all cursor-pointer border-0 shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5"
            >
              Começar a usar agora
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* B2B Section: Para Empresas & Gestores de Obras */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
              Também cuidamos de Empresas
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Gestão carinhosa e transparente para suas equipes em campo
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Traga sua empresa para o futuro. Cuide da sua equipe facilitando a vida deles. Chega de planilhas confusas e controle opressor. Use geolocalização e transparência.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {b2bHighlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                  <div className={`w-14 h-14 rounded-2xl ${item.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-8 py-4 rounded-2xl text-sm inline-flex items-center gap-2 transition-all cursor-pointer border-0 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5"
            >
              Criar Perfil da Empresa
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo iconSize="xs" />
            <span className="font-bold text-slate-900">DPoint © 2026</span>
            <span>— O Tracker Feito com Carinho</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors no-underline font-medium">Sua Privacidade Importa</a>
            <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors no-underline font-medium">Termos de Uso</a>
            <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors no-underline font-medium">Central de Ajuda</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
