import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, Building2, User, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { dataService } from '../utils/gasClient';
import { useI18n } from '../i18n';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Invitation, EmpresaAdmin } from '../types';

type InviteStatus = 'loading' | 'valid' | 'expired' | 'used' | 'error' | 'success';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useI18n();
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError(t('invite.invalidLink'));
      return;
    }
    validateToken();
  }, [token]);

  useEffect(() => {
    if (status !== 'valid' || !invitation) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email === invitation.email) {
        setLoading(true);
        try {
          await acceptInviteWithUid(firebaseUser.uid);
        } catch (err: any) {
          console.error('Erro ao aceitar convite:', err);
          setError(err.message || t('invite.errAccept'));
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [status, invitation]);

  const acceptInviteWithUid = async (firebaseUid: string) => {
    if (!invitation) return;

    if (invitation.role === 'empresa_admin') {
      const adminData: EmpresaAdmin = {
        uid: firebaseUid,
        email: invitation.email,
        nome: invitation.nome || '',
        empresa_id: invitation.empresa_id,
        empresa_nome: invitation.empresa_nome,
        role: 'empresa_admin',
        ativo: true,
        data_criacao: new Date().toISOString().split('T')[0],
      };
      await setDoc(doc(db, 'empresa_admins', firebaseUid), adminData);
    } else {
      const funcQuery = query(
        collection(db, 'funcionarios'),
        where('email', '==', invitation.email)
      );
      const funcSnap = await getDocs(funcQuery);
      if (!funcSnap.empty) {
        await updateDoc(funcSnap.docs[0].ref, {
          status: 'Ativo',
        });
      }
    }

    await dataService.updateInvitation(invitation.token, {
      status: 'used',
      used_at: new Date().toISOString(),
    });

    setStatus('success');
  };

  const validateToken = async () => {
    try {
      const inv = await dataService.loadInvitationByToken(token!);
      if (!inv) {
        setStatus('error');
        setError(t('invite.notFound'));
        return;
      }
      if (inv.status === 'used') {
        setStatus('used');
        return;
      }
      if (new Date(inv.expires_at) < new Date()) {
        setStatus('expired');
        await dataService.updateInvitation(inv.token, { status: 'expired' });
        return;
      }
      setInvitation(inv);
      setStatus('valid');
    } catch (err) {
      console.error('Erro ao validar convite:', err);
      setStatus('error');
      setError(t('invite.validateError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (password !== confirmPassword) {
      setError(t('invite.errMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('invite.errWeak'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, invitation.email, password);
      const firebaseUid = userCredential.user.uid;

      await acceptInviteWithUid(firebaseUid);
    } catch (err: any) {
      console.error('Erro ao criar conta:', err);
      const msg = err.message || t('invite.errCreate');
      if (msg.includes('auth/email-already-in-use')) {
        setError(t('invite.errInUse'));
      } else if (msg.includes('auth/weak-password')) {
        setError(t('invite.errWeak'));
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  const statusPages: Record<string, { icon: React.ReactNode; iconBg: string; title: string; message: string; action: string }> = {
    error: {
      icon: <AlertCircle className="w-8 h-8 text-red-500" />,
      iconBg: 'bg-red-100',
      title: t('invite.invalid'),
      message: error,
      action: t('invite.goLogin'),
    },
    expired: {
      icon: <AlertCircle className="w-8 h-8 text-amber-500" />,
      iconBg: 'bg-amber-100',
      title: t('invite.expired'),
      message: t('invite.expiredMsg'),
      action: t('invite.goLogin'),
    },
    used: {
      icon: <CheckCircle className="w-8 h-8 text-blue-500" />,
      iconBg: 'bg-blue-100',
      title: t('invite.used'),
      message: t('invite.usedMsg'),
      action: t('invite.goLogin'),
    },
    success: {
      icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
      iconBg: 'bg-emerald-100',
      title: t('invite.success'),
      message: t('invite.successMsg'),
      action: t('invite.accessPlatform'),
    },
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">{t('invite.validating')}</p>
        </div>
      </div>
    );
  }

  if (status !== 'valid') {
    const page = statusPages[status];
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl ${page.iconBg} flex items-center justify-center mx-auto`}>
            {page.icon}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{page.title}</h1>
            <p className="text-sm text-slate-500 mt-2">{page.message}</p>
          </div>
          <Link
            to="/login"
            className="inline-block px-6 py-2.5 bg-brand-gradient text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all no-underline shadow-md shadow-indigo-600/20"
          >
            {page.action}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <Logo iconSize="xs" />
          <span className="text-sm font-bold text-slate-800">{t('checkin.title')}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              {invitation?.role === 'empresa_admin' ? (
                <Building2 className="w-8 h-8 text-indigo-500" />
              ) : (
                <User className="w-8 h-8 text-indigo-500" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-800">{t('invite.accept')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {invitation?.role === 'empresa_admin'
                ? t('invite.acceptAdmin')
                : t('invite.acceptWorker')}
            </p>
          </div>

          <div className="bg-slate-100 rounded-xl px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{invitation?.email}</span>
            </div>
            {invitation?.empresa_nome && (
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{invitation.empresa_nome}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t('common.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('invite.passwordHint')}
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

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t('common.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('invite.repeatPassword')}
                  required
                  minLength={6}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gradient text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer border-0 shadow-md shadow-indigo-600/20 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('invite.createAccount')}
            </button>

            <p className="text-xs text-slate-400 text-center">
              {t('invite.haveAccount')}{' '}
              <Link to="/login" className="text-indigo-500 font-semibold no-underline">
                {t('invite.doLogin')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
