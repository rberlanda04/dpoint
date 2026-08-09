import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle, User, ArrowRight, CheckCircle2, Wallet, Clock, Share2, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';

import img2 from '../imgs/front-view-woman-working-as-engineer.jpg';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerWorker, loading: authLoading } = useAuth();
  const { t } = useI18n();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await registerWorker(email, password, name);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Conta criada com sucesso!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Sua conta foi criada. Você já pode acessar o Portal Trabalhador.
          </p>
          <button
            onClick={() => navigate('/worker')}
            className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 cursor-pointer border-0 transition-all flex items-center justify-center gap-2"
          >
            Acessar Portal Trabalhador
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-slate-400 mt-4">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700">Voltar para o Login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Painel de marca (desktop) */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-dot-pattern opacity-20" />
        <Link to="/" className="flex items-center gap-2.5 no-underline relative">
          <Logo iconSize="sm" />
          <span className="text-base font-bold text-white">DPoint</span>
        </Link>
        
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Gerencie seus horários<br />e maximize seus ganhos
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            Crie sua conta gratuita e comece a registrar seus pontos, acompanhar seus ganhos e compartilhar seus dados.
          </p>
          <div className="space-y-3 pt-4">
            {[
              { icon: Clock, text: 'Registro de ponto fácil' },
              { icon: TrendingUp, text: 'Projeção de ganhos' },
              { icon: Share2, text: 'Compartilhamento de dados' },
              { icon: Wallet, text: 'Controle financeiro' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-white/50 text-xs relative">{t('landing.footer')}</p>
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
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-800">Criar Conta Trabalhador</h1>
              <p className="text-sm text-slate-500 mt-1">Cadastre-se gratuitamente</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
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
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    minLength={6}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer border-0 shadow-md shadow-emerald-600/20 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Criar Conta Grátis'}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center">
              Já tem uma conta?{' '}
              <Link to="/login?type=trabalhador" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Fazer login
              </Link>
            </p>

            <p className="text-xs text-slate-400 text-center">
              É empresa ou funcionário?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                Acessar Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
