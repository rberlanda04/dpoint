import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { useI18n } from '../i18n';
import { UserRole, EmpresaAdmin } from '../types';

const SUPER_ADMIN_EMAIL = 'r.berlanda04@gmail.com';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isEmpresaAdmin: boolean;
  userRole: UserRole | null;
  empresaAdmin: EmpresaAdmin | null;
  accessError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  registerWorker: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  clearAccessError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [empresaAdmin, setEmpresaAdmin] = useState<EmpresaAdmin | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const role = await loadUserRole(firebaseUser);
        setUserRole(role);
      } else {
        setUserRole(null);
        setEmpresaAdmin(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadUserRole = async (firebaseUser: FirebaseUser): Promise<UserRole> => {
    if (firebaseUser.email === SUPER_ADMIN_EMAIL) {
      return 'super_admin';
    }

    try {
      // Try UID-based lookup first
      const adminDoc = await getDoc(doc(db, 'empresa_admins', firebaseUser.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data() as EmpresaAdmin;
        if (data.ativo) {
          setEmpresaAdmin(data);
          return 'empresa_admin';
        } else {
          setAccessError(t('auth.accountDisabled'));
          await signOut(auth);
          return 'funcionario';
        }
      }

      // Fallback: email-based lookup in empresa_admins
      const adminEmailQuery = query(
        collection(db, 'empresa_admins'),
        where('email', '==', firebaseUser.email)
      );
      const adminSnap = await getDocs(adminEmailQuery);
      if (!adminSnap.empty) {
        const adminData = adminSnap.docs[0].data() as EmpresaAdmin;
        if (adminData.ativo) {
          setEmpresaAdmin(adminData);
          return 'empresa_admin';
        } else {
          setAccessError(t('auth.accountDisabled'));
          await signOut(auth);
          return 'funcionario';
        }
      }

      // Check funcionarios collection
      const userQuery = query(
        collection(db, 'funcionarios'),
        where('email', '==', firebaseUser.email)
      );
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) {
        const funcData = userSnap.docs[0].data();
        if (funcData.status === 'Ativo') {
          return 'funcionario';
        } else {
          setAccessError(t('auth.registrationDisabled'));
          await signOut(auth);
          return 'funcionario';
        }
      }

      // Check trabalhadores collection (B2C workers)
      const trabalhadorQuery = query(
        collection(db, 'trabalhadores'),
        where('email', '==', firebaseUser.email)
      );
      const trabalhadorSnap = await getDocs(trabalhadorQuery);
      if (!trabalhadorSnap.empty) {
        return 'trabalhador_avulso';
      }

      // Check for pending invitation — auto-create empresa_admins.
      // Observação: com as regras atuais, listagem de convites exige admin,
      // então esta consulta pode falhar por permissão — nesse caso o fluxo
      // principal (InvitePage) já provisionou o acesso, e caímos no erro final.
      try {
        const inviteQuery = query(
          collection(db, 'invitations'),
          where('email', '==', firebaseUser.email),
          where('status', '==', 'pending')
        );
        const inviteSnap = await getDocs(inviteQuery);
        if (!inviteSnap.empty) {
          const inviteDoc = inviteSnap.docs[0];
          const inviteData = inviteDoc.data() as any;

          if (inviteData.role === 'empresa_admin') {
            const adminData: EmpresaAdmin = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              nome: inviteData.nome || '',
              empresa_id: inviteData.empresa_id,
              empresa_nome: inviteData.empresa_nome,
              role: 'empresa_admin',
              ativo: true,
              data_criacao: new Date().toISOString().split('T')[0],
            };
            await setDoc(doc(db, 'empresa_admins', firebaseUser.uid), adminData);
            await updateDoc(inviteDoc.ref, { status: 'used', used_at: new Date().toISOString() });
            setEmpresaAdmin(adminData);
            return 'empresa_admin';
          }

          if (inviteData.role === 'funcionario') {
            const funcQuery2 = query(
              collection(db, 'funcionarios'),
              where('email', '==', firebaseUser.email)
            );
            const funcSnap2 = await getDocs(funcQuery2);
            if (!funcSnap2.empty) {
              await updateDoc(funcSnap2.docs[0].ref, { status: 'Ativo' });
            }
            await updateDoc(inviteDoc.ref, { status: 'used', used_at: new Date().toISOString() });
            return 'funcionario';
          }
        }
      } catch (inviteError) {
        // Sem permissão para listar convites (esperado para não-admins)
        console.warn('Consulta de convites ignorada (permissão):', inviteError);
      }

      // Se não encontrou em nenhuma coleção, cria como trabalhador avulso (B2C)
      // Isso permite login com Google para novos trabalhadores
      const trabalhadorData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Trabalhador',
        tipo: 'independente',
        data_criacao: new Date().toISOString().split('T')[0],
        status: 'Ativo',
      };
      await setDoc(doc(db, 'trabalhadores', firebaseUser.uid), trabalhadorData);
      return 'trabalhador_avulso';
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
      return 'funcionario';
    }
  };

  const isSuperAdmin = userRole === 'super_admin';
  const isEmpresaAdmin = userRole === 'empresa_admin';

  const login = async (email: string, password: string) => {
    setAccessError(null);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    setAccessError(null);
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const registerWorker = async (email: string, password: string, name: string) => {
    setAccessError(null);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Create worker profile in Firestore
    await setDoc(doc(db, 'trabalhadores', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      nome: name,
      tipo: 'independente', // B2C worker
      data_criacao: new Date().toISOString().split('T')[0],
      status: 'Ativo',
    });
  };

  const loginWithGoogle = async () => {
    setAccessError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const loginWithApple = async () => {
    setAccessError(null);
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUserRole(null);
    setEmpresaAdmin(null);
    setAccessError(null);
  };

  const clearAccessError = () => setAccessError(null);

  return (
    <AuthContext.Provider value={{ user, loading, isSuperAdmin, isEmpresaAdmin, userRole, empresaAdmin, accessError, login, register, registerWorker, loginWithGoogle, loginWithApple, logout, clearAccessError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
