import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Key, LogOut, ChevronLeft, Menu, Shield, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { TranslationKey } from '../../i18n/pt';
import Logo from '../Logo';
import LanguageSwitcher from '../LanguageSwitcher';

const PORTAL_NAV: { to: string; icon: any; labelKey: TranslationKey }[] = [
  { to: '/portal/empresas', icon: Building2, labelKey: 'nav.companies' },
  { to: '/portal/admins', icon: Shield, labelKey: 'nav.admins' },
  { to: '/portal/convites', icon: Mail, labelKey: 'nav.invitations' },
  { to: '/portal/chaves', icon: Key, labelKey: 'nav.apiKeys' },
];

export default function PortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col fixed h-full z-30">
        <div className="p-5 border-b border-slate-800">
          <Link to="/portal" className="flex items-center gap-2.5 no-underline">
            <Logo iconSize="sm" />
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">{t('checkin.title')}</h1>
              <p className="text-[10px] text-slate-400">{t('nav.saasPortal')}</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {PORTAL_NAV.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all ${
                isActive(to)
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="px-1">
            <LanguageSwitcher variant="dark" />
          </div>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'S'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.email || 'Admin'}</p>
              <p className="text-[10px] text-slate-500">{t('nav.superAdmin')}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer border-0 bg-transparent text-left"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 z-40 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer border-0 bg-transparent"
        >
          {mobileOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link to="/portal" className="flex items-center gap-2 no-underline">
          <Logo iconSize="xs" />
          <span className="text-sm font-bold text-white">{t('nav.saasPortal')}</span>
        </Link>
        <LanguageSwitcher variant="dark" />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/20 z-30" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-[57px] left-0 right-0 bg-slate-900 border-b border-slate-800 z-40 p-3 space-y-1 animate-slideUp">
            {PORTAL_NAV.map(({ to, icon: Icon, labelKey }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-all ${
                  isActive(to)
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </Link>
            ))}
            <div className="border-t border-slate-800 pt-2 mt-2">
              <button
                onClick={() => { logout(); navigate('/login'); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 cursor-pointer border-0 bg-transparent text-left"
              >
                <LogOut className="w-4 h-4" />
                {t('common.logout')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="lg:hidden h-14" />
        <Outlet />
      </main>
    </div>
  );
}
