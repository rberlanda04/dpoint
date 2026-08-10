import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MapPin, ClipboardList, Settings, LogOut, ChevronLeft, Menu, Radio, Briefcase, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { TranslationKey } from '../../i18n/pt';
import Logo from '../Logo';
import LanguageSwitcher from '../LanguageSwitcher';
import PwaInstallBanner from '../PwaInstallBanner';

const NAV_ITEMS: { to: string; icon: any; labelKey: TranslationKey; end?: boolean }[] = [
  { to: '/app/dashboard', icon: Home, labelKey: 'nav.overview', end: true },
  { to: '/app/dashboard/funcionarios', icon: Users, labelKey: 'nav.employees' },
  { to: '/app/dashboard/obras', icon: MapPin, labelKey: 'nav.sites' },
  { to: '/app/dashboard/registros', icon: ClipboardList, labelKey: 'nav.records' },
  { to: '/app/dashboard/auto-checkin', icon: Radio, labelKey: 'nav.autoCheckin' },
  { to: '/app/dashboard/b2b', icon: Briefcase, labelKey: 'nav.b2b' },
  { to: '/app/dashboard/config', icon: Settings, labelKey: 'nav.settings' },
];

const BOTTOM_TABS = [
  { to: '/app/dashboard', icon: Home, labelKey: 'nav.overview' as TranslationKey },
  { to: '/app/dashboard/funcionarios', icon: Users, labelKey: 'nav.employees' as TranslationKey },
  { to: '/app/dashboard/registros', icon: ClipboardList, labelKey: 'nav.records' as TranslationKey },
  { to: '/app/dashboard/config', icon: Settings, labelKey: 'nav.settings' as TranslationKey },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-30">
        <div className="p-5 border-b border-slate-100">
          <Link to="/app/dashboard" className="flex items-center gap-2.5 no-underline">
            <Logo iconSize="sm" />
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">{t('checkin.title')}</h1>
              <p className="text-[10px] text-slate-400">{t('nav.adminPanel')}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all ${
                isActive(to, end)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:translate-x-1'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="px-1">
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{user?.email || t('nav.user')}</p>
              <p className="text-[10px] text-slate-400">{t('nav.admin')}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer border-0 bg-transparent text-left"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-40 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer border-0 bg-transparent transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
        </button>
        <Link to="/app/dashboard" className="flex items-center gap-2 no-underline">
          <Logo iconSize="xs" />
          <span className="text-sm font-bold text-slate-800">{t('checkin.title')}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-0 left-0 right-0 bg-white z-50 shadow-2xl animate-slideUp max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo iconSize="xs" />
                <span className="text-sm font-bold text-slate-800">{t('checkin.title')}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline transition-all ${
                    isActive(to, end)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t(labelKey)}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{user?.email || t('nav.user')}</p>
                  <p className="text-[11px] text-slate-400">{t('nav.admin')}</p>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer border-0 bg-transparent text-left transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {t('common.logout')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="lg:hidden h-14" />
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-30 safe-area-bottom">
        <nav className="flex items-center justify-around px-2 py-1">
          {BOTTOM_TABS.map(({ to, icon: Icon, labelKey }) => {
            const active = isActive(to, to === '/app/dashboard');
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all no-underline min-w-[60px] ${
                  active
                    ? 'text-emerald-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-emerald-50' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold">{t(labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* PWA Install Banner */}
      <PwaInstallBanner />
    </div>
  );
}
