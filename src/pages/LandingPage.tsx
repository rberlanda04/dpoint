import React from 'react';
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
  UserCheck,
  Briefcase,
  PieChart,
  DollarSign,
  Calendar,
  Target,
  FileText,
  Smartphone,
  Camera
} from 'lucide-react';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../i18n';

// Import images
import img1 from '../imgs/construction-worker-with-document-plan-working-inside-building-construction-site.jpg';
import img2 from '../imgs/front-view-woman-working-as-engineer.jpg';
import img5 from '../imgs/businessmen-hands-white-table-with-documents-drafts.jpg';
import img6 from '../imgs/worker-is-cutting-wires-with-lineman-s-pliers.jpg';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const b2bFeatures = [
    {
      icon: Building2,
      title: 'Gestão de Equipes',
      description: 'Cadastre funcionários, obras e acompanhe toda a equipe em tempo real.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: MapPin,
      title: 'Geofence GPS',
      description: 'Cerca virtual com validação de localização. Registros precisos e auditáveis.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: BarChart3,
      title: 'Relatórios Automáticos',
      description: 'Dashboards, exportação CSV e relatórios trabalhistas prontos.',
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
    },
  ];

  const b2cFeatures = [
    {
      icon: Clock,
      title: 'Registro de Ponto',
      description: 'Registre seus horários de trabalho com facilidade pelo celular.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: TrendingUp,
      title: 'Projeção de Ganhos',
      description: 'Configure sua hora e acompanhe quanto você vai ganhar no mês.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: Share2,
      title: 'Compartilhamento',
      description: 'Envie seus horários para empregadores, clientes ou contadores.',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  const stats = [
    { value: '500+', label: 'Empresas ativas', icon: Building2 },
    { value: '10k+', label: 'Trabalhadores', icon: Users },
    { value: '99.9%', label: 'Uptime', icon: Shield },
    { value: '24/7', label: 'Suporte', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-800 tracking-tight">DPoint</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
            >
              {t('landing.login')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="hidden sm:block text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all cursor-pointer border-0"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" />
              {t('landing.badge')}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
              {t('landing.heroTitle1')}{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">{t('landing.heroTitle2')}</span>
            </h1>
            <p className="text-lg text-slate-500 mt-6 leading-relaxed max-w-2xl mx-auto">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-10">
              <button
                onClick={() => navigate('/register')}
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer border-0"
              >
                {t('landing.ctaStart')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-slate-700 font-semibold px-8 py-3.5 rounded-xl text-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                {t('landing.login')}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3">{t('landing.ctaSubtitle')}</p>
            {/* Trust badges */}
            <div className="flex flex-wrap justify-center items-center gap-6 mt-12 pt-8 border-t border-slate-100">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* B2B Section - Para Empresas */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
                <Building2 className="w-3.5 h-3.5" />
                Para Empresas (B2B)
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Sistema de gestão de ponto para sua empresa
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Cadastre sua equipe, configure obras e acompanhe todos os registros em tempo real. 
                Relatórios trabalhistas automáticos e dashboards completos.
              </p>
              <div className="space-y-4">
                {b2bFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${f.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                      <p className="text-sm text-slate-500">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/login')}
                className="mt-8 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all cursor-pointer border-0 shadow-lg shadow-indigo-600/25"
              >
                Acessar Portal Empresa
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                  <img src={img5} alt="Gestão empresarial" className="w-full h-72 object-cover" />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Equipe ativa</p>
                      <p className="text-lg font-bold text-slate-900">48 funcionários</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2C Section - Para Trabalhadores */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="hidden lg:block order-1">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                  <img src={img2} alt="Trabalhador" className="w-full h-72 object-cover" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Ganhos do mês</p>
                      <p className="text-lg font-bold text-emerald-600">R$ 4.250,00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-2">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
                <Wallet className="w-3.5 h-3.5" />
                Para Trabalhadores (B2C)
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
                Gerencie seus horários e ganhos
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Registre seus pontos, acompanhe seus ganhos e compartilhe seus dados 
                com quem você quiser. Total controle sobre sua jornada.
              </p>
              <div className="space-y-4">
                {b2cFeatures.map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${f.bgColor} rounded-xl flex items-center justify-center shrink-0`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                      <p className="text-sm text-slate-500">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/register')}
                className="mt-8 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all cursor-pointer border-0 shadow-lg shadow-emerald-600/25"
              >
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={img2} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur-sm">
            <Lock className="w-3.5 h-3.5" />
            B2B + B2C
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-white/70 mt-3 max-w-lg mx-auto">
            {t('landing.ctaSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <button
              onClick={() => navigate('/register')}
              className="bg-white text-slate-900 font-semibold px-8 py-3.5 rounded-xl text-sm hover:bg-slate-100 hover:-translate-y-0.5 transition-all cursor-pointer border-0 shadow-lg flex items-center gap-2"
            >
              {t('landing.ctaButton')}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {t('landing.login')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo iconSize="xs" />
            <span className="text-xs text-slate-400">{t('landing.footer')}</span>
          </div>
          <div className="flex gap-6 text-xs text-slate-400">
            <span>{t('landing.privacy')}</span>
            <span>{t('landing.terms')}</span>
            <span>{t('landing.support')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
