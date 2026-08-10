import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  QrCode,
  DollarSign,
  Calendar,
  BarChart3,
  Smartphone,
  Share2,
  Clock,
  User,
  ArrowRight,
  CheckCheck,
  Zap
} from 'lucide-react';
import Logo from '../../components/Logo';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useI18n } from '../../i18n';

export default function WorkerLandingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const features = [
    {
      icon: Clock,
      title: t('worker.landing.feature1Title'),
      description: t('worker.landing.feature1Desc'),
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: DollarSign,
      title: t('worker.landing.feature2Title'),
      description: t('worker.landing.feature2Desc'),
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: BarChart3,
      title: t('worker.landing.feature3Title'),
      description: t('worker.landing.feature3Desc'),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: Calendar,
      title: t('worker.landing.feature4Title'),
      description: t('worker.landing.feature4Desc'),
      color: 'text-sky-600 bg-sky-50',
    },
    {
      icon: Share2,
      title: t('worker.landing.feature5Title'),
      description: t('worker.landing.feature5Desc'),
      color: 'text-rose-600 bg-rose-50',
    },
    {
      icon: Smartphone,
      title: t('worker.landing.feature6Title'),
      description: t('worker.landing.feature6Desc'),
      color: 'text-violet-600 bg-violet-50',
    },
  ];

  const steps = [
    { num: '01', title: t('worker.landing.step1Title'), description: t('worker.landing.step1Desc') },
    { num: '02', title: t('worker.landing.step2Title'), description: t('worker.landing.step2Desc') },
    { num: '03', title: t('worker.landing.step3Title'), description: t('worker.landing.step3Desc') },
    { num: '04', title: t('worker.landing.step4Title'), description: t('worker.landing.step4Desc') },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-800 tracking-tight">{t('checkin.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
            >
              {t('landing.login')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-emerald-50 pointer-events-none" />
        <div className="absolute inset-0 bg-dot-pattern opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white border border-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-sm">
              <Zap className="w-3.5 h-3.5" />
              {t('worker.landing.badge')}
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
              {t('worker.landing.heroTitle1')}{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-emerald-600 bg-clip-text text-transparent">
                {t('worker.landing.heroTitle2')}
              </span>
            </h1>
            <p className="text-lg text-slate-500 mt-6 leading-relaxed max-w-xl">
              {t('worker.landing.heroSubtitle')}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={() => navigate('/login?tab=trabalhador')}
                className="bg-gradient-to-r from-amber-600 via-orange-500 to-emerald-600 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-600/25 hover:shadow-xl hover:shadow-amber-600/30 hover:-translate-y-0.5 cursor-pointer border-0"
              >
                {t('worker.landing.ctaStart')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login?tab=trabalhador')}
                className="bg-white text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
              >
                {t('worker.landing.ctaLogin')}
              </button>
            </div>
          </div>

          {/* Hero visual - mobile app mockup */}
          <div className="hidden lg:block absolute right-8 top-20 w-80">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 space-y-4 animate-slideUp">
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t('worker.landing.mockActive')}</p>
                  <p className="text-xs text-slate-400">{t('worker.landing.mockSite')}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-amber-600">08:42</p>
                  <p className="text-xs text-emerald-600">{t('worker.landing.mockInside')}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t('worker.landing.mockEarnedToday')}</p>
                      <p className="text-lg font-bold text-slate-800">R$ 240,00</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t('worker.landing.mockWeekHours')}</p>
                      <p className="text-lg font-bold text-slate-800">38.5h</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                      <CheckCheck className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{t('worker.landing.mockStreak')}</p>
                      <p className="text-lg font-bold text-slate-800">12 {t('worker.landing.mockDays')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t('worker.landing.featuresTitle')}
            </h2>
            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              {t('worker.landing.featuresSubtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {t('worker.landing.howTitle')}
            </h2>
            <p className="text-slate-500 mt-3">
              {t('worker.landing.howSubtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center sm:text-left">
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent mb-3">{s.num}</div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-amber-600/30 to-emerald-600/30 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t('worker.landing.testimonialsTitle')}
            </h2>
            <p className="text-slate-400 mt-3">
              {t('worker.landing.testimonialsSubtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { quote: t('worker.landing.testimonial1'), author: 'Carlos S.', role: t('worker.landing.rolePedreiro'), avatar: 'CS' },
              { quote: t('worker.landing.testimonial2'), author: 'Maria L.', role: t('worker.landing.rolePintora'), avatar: 'ML' },
              { quote: t('worker.landing.testimonial3'), author: 'João P.', role: t('worker.landing.roleEletricista'), avatar: 'JP' },
            ].map((test, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <p className="text-slate-300 mb-4 leading-relaxed">"{test.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-bold">
                    {test.avatar}
                  </div>
                  <div>
                    <p className="text-white font-medium">{test.author}</p>
                    <p className="text-xs text-slate-400">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-amber-600 via-orange-500 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-white pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center relative">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t('worker.landing.ctaTitle')}
          </h2>
          <p className="text-amber-100 mt-3 max-w-lg mx-auto">
            {t('worker.landing.ctaSubtitle')}
          </p>
          <button
            onClick={() => navigate('/login?tab=trabalhador')}
            className="mt-8 bg-white text-amber-700 font-semibold px-8 py-3.5 rounded-xl text-sm hover:bg-amber-50 hover:-translate-y-0.5 transition-all cursor-pointer border-0 shadow-lg"
          >
            {t('worker.landing.ctaButton')}
          </button>
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