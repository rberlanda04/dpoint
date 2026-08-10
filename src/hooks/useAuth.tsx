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

// Super admin is now determined by the /super_admins/{uid} collection in Firestore
// instead of a hardcoded email. Create a document with { ativo: true } for each super admin.

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
    // Check super_admins collection by UID
    let isSuperAdmin = false;
    try {
      const superAdminDoc = await getDoc(doc(db, 'super_admins', firebaseUser.uid));
      if (superAdminDoc.exists() && superAdminDoc.data().ativo === true) {
        return 'super_admin';
      }
      isSuperAdmin = superAdminDoc.exists() && superAdminDoc.data().ativo === true;
    } catch (e) {
      console.warn('super_admins read error:', e);
    }

    // Auto-provision: if no super_admins doc exists for this user
    if (!isSuperAdmin && firebaseUser.email) {
      try {
        const configRef = doc(db, 'config', 'super_admin_emails');
        const configDoc = await getDoc(configRef);
        if (configDoc.exists()) {
          const emails: string[] = configDoc.data().emails || [];
          if (emails.includes(firebaseUser.email)) {
            await setDoc(doc(db, 'super_admins', firebaseUser.uid), {
              email: firebaseUser.email,
              ativo: true,
              data_criacao: new Date().toISOString().split('T')[0],
            });
            return 'super_admin';
          }
        } else {
          // Bootstrap: no config exists — create it with this user as first super admin
          console.log('Bootstrap: creating first super_admin for', firebaseUser.email);
          await setDoc(configRef, { emails: [firebaseUser.email] });
          await setDoc(doc(db, 'super_admins', firebaseUser.uid), {
            email: firebaseUser.email,
            ativo: true,
            data_criacao: new Date().toISOString().split('T')[0],
          });
          return 'super_admin';
        }
      } catch (e) {
        console.error('Bootstrap error:', e);
      }
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
          return 'none';
        }
      }

      // Fallback: email-based lookup in empresa_admins
      try {
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
            return 'none';
          }
        }
      } catch {
        // Permission denied for empresa_admins list — continue
      }

      // Check funcionarios collection
      try {
        const userQuery = query(
          collection(db, 'funcionarios'),
          where('email', '==', firebaseUser.email)
        );
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          // Check if user also exists as B2C worker — if so, prioritize worker role
          const trabalhadorDoc = await getDoc(doc(db, 'trabalhadores', firebaseUser.uid));
          if (trabalhadorDoc.exists()) {
            return 'trabalhador_avulso';
          }
          const funcData = userSnap.docs[0].data();
          if (funcData.status === 'Ativo') {
            return 'funcionario';
          } else {
            setAccessError(t('auth.registrationDisabled'));
            await signOut(auth);
            return 'none';
          }
        }
      } catch {
        // Permission denied for funcionarios list — continue
      }

      // Check trabalhadores collection (B2C workers)
      try {
        const trabalhadorQuery = query(
          collection(db, 'trabalhadores'),
          where('email', '==', firebaseUser.email)
        );
        const trabalhadorSnap = await getDocs(trabalhadorQuery);
        if (!trabalhadorSnap.empty) {
          return 'trabalhador_avulso';
        }
      } catch {
        // Permission denied for trabalhadores list — continue
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
      } catch {
        // Sem permissão para listar convites (esperado para não-admins)
      }

      // Se não encontrou em nenhuma coleção, NÃO cria automaticamente
      // Usuário deve se cadastrar primeiro via /register ou ser convidado
      setAccessError(t('auth.emailNotRegistered'));
      await signOut(auth);
      return 'none';
    } catch (error) {
      console.error('Erro ao carregar role do usuário:', error);
      return 'none';
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

  const loginWithGoogle = async (autoCreateWorker = false) => {
    setAccessError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    
    // Se não encontrou em nenhuma coleção e autoCreateWorker está habilitado,
    // cria como trabalhador avulso (B2C)
    if (autoCreateWorker) {
      const existingDoc = await getDoc(doc(db, 'trabalhadores', cred.user.uid));
      if (!existingDoc.exists()) {
        const adminQuery = await getDocs(query(collection(db, 'empresa_admins'), where('email', '==', cred.user.email)));
        const funcQuery = await getDocs(query(collection(db, 'funcionarios'), where('email', '==', cred.user.email)));
        if (adminQuery.empty && funcQuery.empty) {
          const trabalhadorData = {
            uid: cred.user.uid,
            email: cred.user.email,
            nome: cred.user.displayName || cred.user.email?.split('@')[0] || 'Trabalhador',
            tipo: 'independente',
            data_criacao: new Date().toISOString().split('T')[0],
            status: 'Ativo',
          };
          await setDoc(doc(db, 'trabalhadores', cred.user.uid), trabalhadorData);
        }
      }
    }
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
