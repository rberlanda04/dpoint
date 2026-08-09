import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { useI18n } from '../i18n';
import { TrabalhadorAvulso } from '../types';

interface WorkerAuthContextType {
  user: FirebaseUser | null;
  trabalhador: TrabalhadorAvulso | null;
  loading: boolean;
  isWorker: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nome: string, profissao: string, valorHora: number) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  updateTrabalhador: (data: Partial<TrabalhadorAvulso>) => Promise<void>;
  clearError: () => void;
  error: string | null;
}

const WorkerAuthContext = createContext<WorkerAuthContextType | null>(null);

export function WorkerAuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [trabalhador, setTrabalhador] = useState<TrabalhadorAvulso | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const tData = await loadTrabalhador(firebaseUser.uid);
        setTrabalhador(tData);
      } else {
        setTrabalhador(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadTrabalhador = async (uid: string): Promise<TrabalhadorAvulso | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'trabalhadores_avulsos', uid));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as TrabalhadorAvulso;
    } catch (error) {
      console.error('Erro ao carregar trabalhador:', error);
      return null;
    }
  };

  const isWorker = !!trabalhador;

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      let msg = t('auth.errGeneric');
      if (err.code === 'auth/user-not-found') msg = t('auth.emailNotRegistered');
      else if (err.code === 'auth/wrong-password') msg = t('auth.errWrongPassword');
      else if (err.code === 'auth/invalid-email') msg = t('auth.errInvalidEmail');
      else if (err.code === 'auth/too-many-requests') msg = t('auth.errTooMany');
      setError(msg);
      throw err;
    }
  };

  const register = async (email: string, password: string, nome: string, profissao: string, valorHora: number) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nome });
      
      const agora = new Date().toISOString();
      const trabalhador: TrabalhadorAvulso = {
        id: cred.user.uid,
        nome,
        profissao,
        valor_hora: valorHora,
        created_at: agora,
        updated_at: agora,
      };
      
      await setDoc(doc(db, 'trabalhadores_avulsos', cred.user.uid), trabalhador);
      setTrabalhador(trabalhador);
    } catch (err: any) {
      let msg = t('auth.errGeneric');
      if (err.code === 'auth/email-already-in-use') msg = t('invite.errInUse');
      else if (err.code === 'auth/weak-password') msg = t('invite.errWeak');
      else if (err.code === 'auth/invalid-email') msg = t('auth.errInvalidEmail');
      setError(msg);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      
      // Check if worker profile exists, if not create one
      const tData = await loadTrabalhador(cred.user.uid);
      if (!tData) {
        const agora = new Date().toISOString();
        const novoTrabalhador: TrabalhadorAvulso = {
          id: cred.user.uid,
          nome: cred.user.displayName || 'Trabalhador',
          profissao: 'Profissional',
          valor_hora: 30,
          created_at: agora,
          updated_at: agora,
        };
        await setDoc(doc(db, 'trabalhadores_avulsos', cred.user.uid), novoTrabalhador);
        setTrabalhador(novoTrabalhador);
      }
    } catch (err: any) {
      let msg = t('auth.errGeneric');
      if (err.code === 'auth/popup-blocked') msg = t('auth.errPopupBlocked');
      else if (err.code === 'auth/cancelled-popup-request') msg = t('auth.errCancelled');
      setError(msg);
      throw err;
    }
  };

  const loginWithApple = async () => {
    setError(null);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const cred = await signInWithPopup(auth, provider);
      
      const tData = await loadTrabalhador(cred.user.uid);
      if (!tData) {
        const agora = new Date().toISOString();
        const novoTrabalhador: TrabalhadorAvulso = {
          id: cred.user.uid,
          nome: cred.user.displayName || 'Trabalhador',
          profissao: 'Profissional',
          valor_hora: 30,
          created_at: agora,
          updated_at: agora,
        };
        await setDoc(doc(db, 'trabalhadores_avulsos', cred.user.uid), novoTrabalhador);
        setTrabalhador(novoTrabalhador);
      }
    } catch (err: any) {
      let msg = t('auth.errGeneric');
      if (err.code === 'auth/popup-blocked') msg = t('auth.errPopupBlocked');
      else if (err.code === 'auth/cancelled-popup-request') msg = t('auth.errCancelled');
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setTrabalhador(null);
    setError(null);
  };

  const updateTrabalhador = async (data: Partial<TrabalhadorAvulso>) => {
    if (!user || !trabalhador) return;
    try {
      const updated = { ...trabalhador, ...data, updated_at: new Date().toISOString() };
      await setDoc(doc(db, 'trabalhadores_avulsos', user.uid), updated);
      setTrabalhador(updated);
    } catch (err) {
      console.error('Erro ao atualizar trabalhador:', err);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <WorkerAuthContext.Provider value={{ user, trabalhador, loading, isWorker, login, register, loginWithGoogle, loginWithApple, logout, updateTrabalhador, clearError, error }}>
      {children}
    </WorkerAuthContext.Provider>
  );
}

export function useWorkerAuth() {
  const context = useContext(WorkerAuthContext);
  if (!context) {
    throw new Error('useWorkerAuth must be used within a WorkerAuthProvider');
  }
  return context;
}