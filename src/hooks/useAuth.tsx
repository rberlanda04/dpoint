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
    console.log(`[Auth] loadUserRole start for ${firebaseUser.email} (uid: ${firebaseUser.uid})`);

    // 1. Check super_admins collection by UID
    let hasSuperAdminDoc = false;
    try {
      const superAdminDoc = await getDoc(doc(db, 'super_admins', firebaseUser.uid));
      if (superAdminDoc.exists() && superAdminDoc.data().ativo === true) {
        console.log('[Auth] Step 1: Found active super_admins doc → super_admin');
        return 'super_admin';
      }
      hasSuperAdminDoc = superAdminDoc.exists();
      console.log(`[Auth] Step 1: super_admins exists=${superAdminDoc.exists()}, hasSuperAdminDoc=${hasSuperAdminDoc}`);
    } catch (e) {
      console.warn('[Auth] Step 1: super_admins read error:', e);
    }

    // 2. Check empresa_admins by UID
    try {
      const adminDoc = await getDoc(doc(db, 'empresa_admins', firebaseUser.uid));
      console.log(`[Auth] Step 2: empresa_admins UID exists=${adminDoc.exists()}`);
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
    } catch (e) {
      console.warn('empresa_admins UID read error:', e);
    }

    // 3. Check empresa_admins by email
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

    // 4. Check funcionarios collection
    try {
      const userQuery = query(
        collection(db, 'funcionarios'),
        where('email', '==', firebaseUser.email)
      );
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) {
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

    // 5. Check trabalhadores collection (B2C workers) — by UID
    try {
      let trabalhadorDoc = await getDoc(doc(db, 'trabalhadores', firebaseUser.uid));
      if (!trabalhadorDoc.exists()) {
        await new Promise(r => setTimeout(r, 1500));
        trabalhadorDoc = await getDoc(doc(db, 'trabalhadores', firebaseUser.uid));
      }
      console.log(`[Auth] Step 5: trabalhadores UID exists=${trabalhadorDoc.exists()}`);
      if (trabalhadorDoc.exists()) {
        return 'trabalhador_avulso';
      }
    } catch (e) {
      console.warn('[Auth] Step 5: trabalhadores read error:', e);
    }

    // 6. Check for pending invitations
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
      // Sem permissão para listar convites
    }

    // 7. Bootstrap: only if config/super_admin_emails exists and user's email is listed
    if (firebaseUser.email) {
      try {
        const configRef = doc(db, 'config', 'super_admin_emails');
        const configDoc = await getDoc(configRef);
        if (configDoc.exists()) {
          const emails: string[] = configDoc.data().emails || [];
          console.log(`[Auth] Step 7: config/super_admin_emails exists, emails=${JSON.stringify(emails)}, hasSuperAdminDoc=${hasSuperAdminDoc}`);
          if (emails.includes(firebaseUser.email) && !hasSuperAdminDoc) {
            console.log(`[Auth] Step 7: CREATING super_admins doc for ${firebaseUser.email}`);
            await setDoc(doc(db, 'super_admins', firebaseUser.uid), {
              email: firebaseUser.email,
              ativo: true,
              data_criacao: new Date().toISOString().split('T')[0],
            });
            return 'super_admin';
          }
        } else {
          console.log('[Auth] Step 7: config/super_admin_emails does NOT exist — skipping bootstrap');
        }
      } catch (e) {
        console.error('[Auth] Step 7: Bootstrap error:', e);
      }
    }

    // Se não encontrou em nenhuma coleção, NÃO cria automaticamente
    // Usuário deve se cadastrar primeiro via /register ou ser convidado
    console.log('[Auth] No role found — signing out');
    setAccessError(t('auth.emailNotRegistered'));
    await signOut(auth);
    return 'none';
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
    await setDoc(doc(db, 'trabalhadores', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      nome: name,
      tipo: 'independente',
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
