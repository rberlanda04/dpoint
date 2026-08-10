import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, Building2, Wallet, User, ArrowRight, BarChart3, Clock, MapPin, TrendingUp, Share2, Users, Settings, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Import images
import imgEmpresa from '../imgs/businessmen-hands-white-table-with-documents-drafts.jpg';
import imgFuncionario from '../imgs/construction-worker-using-hammer-job-site.jpg';
import imgTrabalhador from '../imgs/front-view-woman-working-as-engineer.jpg';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, user, userRole, accessError, clearAccessError, loading: authLoading } = useAuth();
  const { t } = useI18n();
  
  const [tab, setTab] = useState<'empresa' | 'funcionario' | 'trabalhador'>(
    searchParams.get('tab') === 'trabalhador' || searchParams.get('type') === 'trabalhador' ? 'trabalhador' :
    searchParams.get('tab') === 'funcionario' || searchParams.get('type') === 'funcionario' ? 'funcionario' : 'empresa'
  );
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accessError) {
      setError(accessError);
      clearAccessError();
    }
  }, [accessError]);

  useEffect(() => {
    if (user && userRole === 'funcionario') {
      navigate('/funcionario');
    } else if (user && userRole === 'empresa_admin') {
      navigate('/app/dashboard');
    } else if (user && userRole === 'super_admin') {
      navigate('/portal');
    } else if (user && userRole === 'trabalhador_avulso') {
      navigate('/worker');
    }
    // If userRole is 'none', stay on login page (error already shown)
  }, [user, userRole, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (user && userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">{t('login.redirecting')}</p>
        </div>
      </div>
    );
  }

  const mapAuthError = (msg: string): string => {
    if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) return t('login.errUserNotFound');
    if (msg.includes('auth/wrong-password')) return t('login.errWrongPassword');
    if (msg.includes('auth/invalid-email')) return t('login.errInvalidEmail');
    if (msg.includes('auth/too-many-requests')) return t('login.errTooMany');
    if (msg.includes('auth/popup-closed-by-user')) return '';
    if (msg.includes('auth/cancelled-popup-request')) return t('login.errCancelled');
    if (msg.includes('auth/popup-blocked')) return t('login.errPopupBlocked');
    return msg || t('login.errGeneric');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.message || '';
      if (tab === 'trabalhador' && (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password'))) {
        navigate('/register');
        return;
      }
      setError(mapAuthError(msg));
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      // Auto-criar trabalhador apenas se estiver na aba "trabalhador"
      await loginWithGoogle(tab === 'trabalhador');
    } catch (err: any) {
      setError(mapAuthError(err.message || ''));
    }
    setLoading(false);
  };

  const getTabConfig = () => {
    switch (tab) {
      case 'empresa':
        return {
          icon: Building2,
          title: 'Portal Empresa',
          subtitle: 'Acesse o painel de gestão da sua empresa',
          color: 'indigo',
          bgColor: 'bg-indigo-50',
          textColor: 'text-indigo-600',
          bgGradient: 'from-indigo-600 via-indigo-700 to-blue-800',
          image: imgEmpresa,
          imageAlt: 'Reunião de negócios',
          heroTitle: 'Gestão de ponto para sua empresa',
          heroSubtitle: 'Cadastre funcionários, configure obras e acompanhe todos os registros em tempo real.',
          features: [
            { icon: Users, text: 'Gestão de equipes' },
            { icon: MapPin, text: 'Geofence GPS' },
            { icon: BarChart3, text: 'Relatórios automáticos' },
          ],
          infoTitle: 'Acesso exclusivo para empresas',
          infoText: 'Este painel é destinado a administradores de empresas cadastradas. Se você é funcionário, use a aba "Funcionário".',
          infoColor: 'indigo',
          buttonGradient: 'from-indigo-600 to-indigo-700',
        };
      case 'funcionario':
        return {
          icon: User,
          title: 'Portal Funcionário',
          subtitle: 'Registre seus pontos de trabalho',
          color: 'sky',
          bgColor: 'bg-sky-50',
          textColor: 'text-sky-600',
          bgGradient: 'from-sky-600 via-sky-700 to-blue-800',
          image: imgFuncionario,
          imageAlt: 'Trabalhador em obra',
          heroTitle: 'Registre seus pontos com facilidade',
          heroSubtitle: 'Escaneie QR Code, valide sua localização e registre seu horário de trabalho.',
          features: [
            { icon: Clock, text: 'Check-in rápido' },
            { icon: MapPin, text: 'Validação GPS' },
            { icon: Settings, text: 'Histórico completo' },
          ],
          infoTitle: 'Acesso via convite',
          infoText: 'Para acessar como funcionário, seu email deve estar cadastrado por uma empresa. Solicite um convite ao administrador.',
          infoColor: 'sky',
          buttonGradient: 'from-sky-600 to-sky-700',
        };
      case 'trabalhador':
        return {
          icon: Wallet,
          title: 'Portal Trabalhador',
          subtitle: 'Gerencie seus horários e ganhos',
          color: 'emerald',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          bgGradient: 'from-emerald-600 via-emerald-700 to-teal-800',
          image: imgTrabalhador,
          imageAlt: 'Engenheira em obra',
          heroTitle: 'Controle seus horários e ganhos',
          heroSubtitle: 'Registre seus pontos, acompanhe seus ganhos e compartilhe seus dados.',
          features: [
            { icon: TrendingUp, text: 'Projeção de ganhos' },
            { icon: Share2, text: 'Compartilhamento' },
            { icon: Clock, text: 'Registro fácil' },
          ],
          infoTitle: 'Cadastro gratuito',
          infoText: 'Crie sua conta gratuitamente para gerenciar seus horários de trabalho e projetar seus ganhos.',
          infoColor: 'emerald',
          buttonGradient: 'from-emerald-600 to-emerald-700',
        };
    }
  };

  const tabConfig = getTabConfig();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Painel de marca (desktop) - Dinâmico */}
      <div className={`hidden lg:flex lg:w-[45%] bg-gradient-to-br ${tabConfig.bgGradient} relative overflow-hidden flex-col justify-between p-12 transition-all duration-500`}>
        {/* Imagem de fundo */}
        <div className="absolute inset-0">
          <img src={tabConfig.image} alt={tabConfig.imageAlt} className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent" />
        </div>
        
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <Logo iconSize="sm" />
            <span className="text-base font-bold text-white">DPoint</span>
          </Link>
        </div>
        
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            {tabConfig.heroTitle}
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            {tabConfig.heroSubtitle}
          </p>
          <div className="space-y-3 pt-4">
            {tabConfig.features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-white/50 text-xs relative z-10">{t('landing.footer')}</p>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline lg:hidden">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-800">DPoint</span>
          </Link>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className={`w-12 h-12 ${tabConfig.bgColor} rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors duration-300`}>
                <tabConfig.icon className={`w-6 h-6 ${tabConfig.textColor}`} />
              </div>
              <h1 className="text-xl font-bold text-slate-800">{tabConfig.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{tabConfig.subtitle}</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setTab('empresa'); setError(''); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-0 transition-all ${
                  tab === 'empresa' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Empresa
              </button>
              <button
                onClick={() => { setTab('funcionario'); setError(''); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-0 transition-all ${
                  tab === 'funcionario' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                <User className="w-3.5 h-3.5 inline mr-1" />
                Funcionário
              </button>
              <button
                onClick={() => { setTab('trabalhador'); setError(''); setEmail(''); setPassword(''); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-0 transition-all ${
                  tab === 'trabalhador' ? 'bg-white text-slate-800 shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 inline mr-1" />
                Trabalhador
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Info boxes */}
            {tab === 'empresa' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-xs text-indigo-700">
                <strong>Empresa:</strong> Acesse para gerenciar funcionários, obras e relatórios trabalhistas.
              </div>
            )}

            {tab === 'funcionario' && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-xs text-sky-700">
                <strong>Funcionário:</strong> Seu email deve estar cadastrado por uma empresa ou você precisa de um convite.
              </div>
            )}

            {tab === 'trabalhador' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700">
                <strong>Trabalhador:</strong> Cadastre-se gratuitamente para gerenciar seus horários e projetar ganhos.
              </div>
            )}

            {/* Google Login (all tabs) */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              Continuar com Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-50 px-3 text-slate-400">ou entre com e-mail</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-gradient-to-r ${tabConfig.buttonGradient} text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer border-0 shadow-md transition-all`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Entrar'}
              </button>
            </form>

            {/* Funcionário: Link para convite */}
            {tab === 'funcionario' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-2">Recebeu um convite?</p>
                <button
                  onClick={() => {
                    const token = prompt('Cole o código do convite:');
                    if (token && token.trim()) {
                      navigate(`/invite/${token.trim()}`);
                    }
                  }}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center justify-center gap-1 mx-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Validar link de convite
                </button>
              </div>
            )}

            {/* Trabalhador: Link para cadastro */}
            {tab === 'trabalhador' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-600 mb-2">Não tem conta?</p>
                <button
                  onClick={() => navigate('/register')}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1 mx-auto"
                >
                  <Wallet className="w-4 h-4" />
                  Criar conta grátis
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Empresa: Link para cadastro */}
            {tab === 'empresa' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-2">Sua empresa ainda não tem acesso?</p>
                <button
                  onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1 mx-auto"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Solicitar acesso para empresa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
