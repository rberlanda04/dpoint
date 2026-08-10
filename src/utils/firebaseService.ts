/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  QueryConstraint,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Funcionario, LocalServico, RegistroPonto, AppDatabase, Empresa, Venda, AccessKey, SystemConfig, EmpresaAdmin, Invitation, TrabalhadorAvulso, ObraPessoal, SessaoTrabalho, Compartilhamento } from '../types';

export class FirebaseService {
  /**
   * Carrega funcionários, locais e registros.
   * @param empresaId quando informado, filtra os dados pela empresa (multi-tenant).
   *                  Registros legados sem empresa_id não são retornados nesse modo.
   */
  public async loadAllData(empresaId?: string): Promise<AppDatabase> {
    try {
      const tenantFilter: QueryConstraint[] = empresaId ? [where('empresa_id', '==', empresaId)] : [];

      const funcsSnap = await getDocs(query(collection(db, 'funcionarios'), ...tenantFilter));
      const funcionarios: Funcionario[] = [];
      funcsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        funcionarios.push({
          id_funcionario: docSnap.id,
          empresa_id: data.empresa_id,
          nome: data.nome || '',
          cargo: data.cargo || '',
          status: data.status || 'Ativo',
          email: data.email,
        } as Funcionario);
      });

      const locaisSnap = await getDocs(query(collection(db, 'locais'), ...tenantFilter));
      const locais: LocalServico[] = [];
      locaisSnap.forEach((docSnap) => {
        const data = docSnap.data();
        locais.push({
          id_local: docSnap.id,
          empresa_id: data.empresa_id,
          nome_empresa: data.nome_empresa || '',
          cidade: data.cidade || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          raio_metros: data.raio_metros || 100,
          raio_auto_checkin: data.raio_auto_checkin,
        } as LocalServico);
      });

      const registrosSnap = await getDocs(
        query(collection(db, 'registros'), ...tenantFilter, orderBy('data_hora', 'desc'))
      );
      const registros: RegistroPonto[] = [];
      registrosSnap.forEach((docSnap) => {
        const data = docSnap.data();
        registros.push({
          id_registro: docSnap.id,
          id_funcionario: data.id_funcionario || '',
          nome_funcionario: data.nome_funcionario || '',
          id_local: data.id_local || '',
          nome_local: data.nome_local || '',
          empresa_id: data.empresa_id,
          tipo: data.tipo || 'Check-in',
          data_hora: data.data_hora || '',
          latitude_registro: data.latitude_registro || 0,
          longitude_registro: data.longitude_registro || 0,
          observacao: data.observacao || '',
          precisao_gps: data.precisao_gps || 0,
          fotos: data.fotos || [],
          dentro_geofence: data.dentro_geofence,
          tipo_verificacao: data.tipo_verificacao || '',
          foto_url: data.foto_url || '',
          auto: data.auto || false,
        } as RegistroPonto);
      });

      return { funcionarios, locais, registros };
    } catch (error) {
      console.error('Erro ao carregar dados do Firebase Firestore:', error);
      throw error;
    }
  }

  public async registrarPonto(registro: RegistroPonto): Promise<void> {
    const saveToFirestore = async (rec: RegistroPonto) => {
      const docRef = doc(db, 'registros', rec.id_registro);
      await setDoc(docRef, {
        id_funcionario: rec.id_funcionario,
        nome_funcionario: rec.nome_funcionario || '',
        id_local: rec.id_local,
        nome_local: rec.nome_local || '',
        empresa_id: rec.empresa_id || '',
        tipo: rec.tipo,
        data_hora: rec.data_hora,
        latitude_registro: rec.latitude_registro,
        longitude_registro: rec.longitude_registro,
        observacao: rec.observacao || '',
        precisao_gps: rec.precisao_gps,
        fotos: rec.fotos || [],
        dentro_geofence: rec.dentro_geofence ?? false,
        tipo_verificacao: rec.tipo_verificacao || '',
        foto_url: rec.foto_url || '',
        auto: rec.auto || false,
      });
    };

    // Check online status
    if (!navigator.onLine) {
      // Queue offline
      const queue = JSON.parse(localStorage.getItem('dpoint_offline_queue') || '[]');
      queue.push(registro);
      localStorage.setItem('dpoint_offline_queue', JSON.stringify(queue));
      return;
    }

    try {
      await saveToFirestore(registro);
      // Attempt flushing offline queue
      this.flushOfflineQueue();
    } catch (error) {
      console.warn('Erro ao salvar no Firestore (armazenando em fila offline):', error);
      const queue = JSON.parse(localStorage.getItem('dpoint_offline_queue') || '[]');
      queue.push(registro);
      localStorage.setItem('dpoint_offline_queue', JSON.stringify(queue));
    }
  }

  /** Flushes any queued offline records to Firestore when online */
  public async flushOfflineQueue(): Promise<void> {
    if (!navigator.onLine) return;
    const raw = localStorage.getItem('dpoint_offline_queue');
    if (!raw) return;

    try {
      const queue: RegistroPonto[] = JSON.parse(raw);
      if (queue.length === 0) return;

      const remaining: RegistroPonto[] = [];
      for (const rec of queue) {
        try {
          const docRef = doc(db, 'registros', rec.id_registro);
          await setDoc(docRef, rec);
        } catch {
          remaining.push(rec);
        }
      }
      if (remaining.length > 0) {
        localStorage.setItem('dpoint_offline_queue', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('dpoint_offline_queue');
      }
    } catch (e) {
      console.error('Erro ao descarregar fila offline:', e);
    }
  }

  public async cadastrarFuncionario(funcionario: Funcionario): Promise<void> {
    try {
      const docRef = doc(db, 'funcionarios', funcionario.id_funcionario);
      const data: Record<string, unknown> = {
        nome: funcionario.nome,
        cargo: funcionario.cargo,
        status: funcionario.status,
        empresa_id: funcionario.empresa_id || '',
      };
      if (funcionario.email) {
        data.email = funcionario.email;
      }
      await setDoc(docRef, data);
    } catch (error) {
      console.error('Erro ao cadastrar funcionário no Firestore:', error);
      throw error;
    }
  }

  public async excluirFuncionario(id: string, empresaId?: string): Promise<void> {
    try {
      // If empresaId provided, verify ownership before deleting
      if (empresaId) {
        const docSnap = await getDoc(doc(db, 'funcionarios', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.empresa_id && data.empresa_id !== empresaId) {
            throw new Error('Unauthorized: Cannot delete employee from another company');
          }
        }
      }
      await deleteDoc(doc(db, 'funcionarios', id));
    } catch (error) {
      console.error('Erro ao excluir funcionário no Firestore:', error);
      throw error;
    }
  }

  public async cadastrarLocal(local: LocalServico): Promise<void> {
    try {
      const docRef = doc(db, 'locais', local.id_local);
      await setDoc(docRef, {
        nome_empresa: local.nome_empresa,
        cidade: local.cidade,
        latitude: local.latitude,
        longitude: local.longitude,
        raio_metros: local.raio_metros,
        raio_auto_checkin: local.raio_auto_checkin || local.raio_metros,
        empresa_id: local.empresa_id || '',
      });
    } catch (error) {
      console.error('Erro ao cadastrar local de serviço no Firestore:', error);
      throw error;
    }
  }

  public async excluirLocal(id: string, empresaId?: string): Promise<void> {
    try {
      // If empresaId provided, verify ownership before deleting
      if (empresaId) {
        const docSnap = await getDoc(doc(db, 'locais', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.empresa_id && data.empresa_id !== empresaId) {
            throw new Error('Unauthorized: Cannot delete location from another company');
          }
        }
      }
      await deleteDoc(doc(db, 'locais', id));
    } catch (error) {
      console.error('Erro ao excluir local no Firestore:', error);
      throw error;
    }
  }

  public async toggleFuncionarioStatus(id: string, status: 'Ativo' | 'Inativo', empresaId?: string): Promise<void> {
    try {
      // If empresaId provided, verify ownership before updating
      if (empresaId) {
        const docSnap = await getDoc(doc(db, 'funcionarios', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.empresa_id && data.empresa_id !== empresaId) {
            throw new Error('Unauthorized: Cannot update employee from another company');
          }
        }
      }
      const docRef = doc(db, 'funcionarios', id);
      await updateDoc(docRef, { status });
    } catch (error) {
      console.error('Erro ao alternar status do funcionário no Firestore:', error);
      throw error;
    }
  }

  /** Exclui registros de ponto de uma empresa específica (em lotes de 400 por batch). */
  public async clearRegistros(empresaId?: string): Promise<void> {
    let q;
    if (empresaId) {
      q = query(collection(db, 'registros'), where('empresa_id', '==', empresaId));
    } else {
      q = collection(db, 'registros');
    }
    const regsSnap = await getDocs(q);
    const docsToDelete = regsSnap.docs;
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      docsToDelete.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // ========================
  // Config
  // ========================
  public async loadConfig(): Promise<Partial<SystemConfig> | null> {
    try {
      const snap = await getDoc(doc(db, 'config', 'app_config'));
      if (!snap.exists()) return null;
      return snap.data() as Partial<SystemConfig>;
    } catch (error) {
      console.error('Erro ao carregar config:', error);
      return null;
    }
  }

  public async saveConfig(config: SystemConfig): Promise<void> {
    try {
      const docRef = doc(db, 'config', 'app_config');
      await setDoc(docRef, config);
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      throw error;
    }
  }

  // ========================
  // SaaS - EMPRESAS
  // ========================
  public async loadEmpresas(): Promise<Empresa[]> {
    try {
      const snap = await getDocs(collection(db, 'empresas'));
      const empresas: Empresa[] = [];
      snap.forEach((docSnap) => {
        empresas.push({ id: docSnap.id, ...docSnap.data() } as Empresa);
      });
      return empresas;
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      return [];
    }
  }

  public async saveEmpresa(empresa: Empresa): Promise<void> {
    try {
      const docRef = doc(db, 'empresas', empresa.id);
      await setDoc(docRef, empresa);
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      throw error;
    }
  }

  public async deleteEmpresa(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'empresas', id));
    } catch (error) {
      console.error('Erro ao excluir empresa:', error);
      throw error;
    }
  }

  public async loadVendas(): Promise<Venda[]> {
    try {
      const snap = await getDocs(query(collection(db, 'vendas'), orderBy('data', 'desc')));
      const vendas: Venda[] = [];
      snap.forEach((docSnap) => {
        vendas.push({ id: docSnap.id, ...docSnap.data() } as Venda);
      });
      return vendas;
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      return [];
    }
  }

  // ========================
  // ACCESS KEYS
  // ========================
  public async loadAccessKeys(): Promise<AccessKey[]> {
    try {
      const snap = await getDocs(collection(db, 'access_keys'));
      const keys: AccessKey[] = [];
      snap.forEach((docSnap) => {
        keys.push({ id: docSnap.id, ...docSnap.data() } as AccessKey);
      });
      return keys;
    } catch (error) {
      console.error('Erro ao carregar chaves:', error);
      return [];
    }
  }

  public async saveAccessKey(key: AccessKey): Promise<void> {
    try {
      const docRef = doc(db, 'access_keys', key.id);
      await setDoc(docRef, key);
    } catch (error) {
      console.error('Erro ao salvar chave:', error);
      throw error;
    }
  }

  public async deleteAccessKey(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'access_keys', id));
    } catch (error) {
      console.error('Erro ao excluir chave:', error);
      throw error;
    }
  }

  // ========================
  // EMPRESA ADMINS
  // ========================
  public async loadEmpresaAdmins(): Promise<EmpresaAdmin[]> {
    try {
      const snap = await getDocs(collection(db, 'empresa_admins'));
      const admins: EmpresaAdmin[] = [];
      snap.forEach((docSnap) => {
        admins.push({ uid: docSnap.id, ...docSnap.data() } as EmpresaAdmin);
      });
      return admins;
    } catch (error) {
      console.error('Erro ao carregar admins de empresa:', error);
      return [];
    }
  }

  public async saveEmpresaAdmin(admin: EmpresaAdmin): Promise<void> {
    try {
      const docRef = doc(db, 'empresa_admins', admin.uid);
      await setDoc(docRef, admin);
    } catch (error) {
      console.error('Erro ao salvar admin de empresa:', error);
      throw error;
    }
  }

  public async deleteEmpresaAdmin(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'empresa_admins', uid));
    } catch (error) {
      console.error('Erro ao excluir admin de empresa:', error);
      throw error;
    }
  }

  // ========================
  // INVITATIONS
  // O ID do documento é o próprio token: permite validação pública por GET
  // sem expor a listagem completa de convites (ver firestore.rules).
  // ========================
  public async loadInvitations(empresaId?: string): Promise<Invitation[]> {
    try {
      const constraints: QueryConstraint[] = empresaId ? [where('empresa_id', '==', empresaId)] : [];
      const snap = await getDocs(query(collection(db, 'invitations'), ...constraints, orderBy('created_at', 'desc')));
      const invitations: Invitation[] = [];
      snap.forEach((docSnap) => {
        invitations.push({ id: docSnap.id, ...docSnap.data() } as Invitation);
      });
      return invitations;
    } catch (error) {
      console.error('Erro ao carregar convites:', error);
      return [];
    }
  }

  public async loadInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const docSnap = await getDoc(doc(db, 'invitations', token));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Invitation;
    } catch (error) {
      console.error('Erro ao buscar convite por token:', error);
      return null;
    }
  }

  public async saveInvitation(invitation: Invitation): Promise<void> {
    try {
      const docRef = doc(db, 'invitations', invitation.token);
      await setDoc(docRef, { ...invitation, id: invitation.token });
    } catch (error) {
      console.error('Erro ao salvar convite:', error);
      throw error;
    }
  }

  /**
   * Atualiza um convite. Se o token mudar (reenvio), cria o documento com o
   * novo token e remove o antigo, mantendo o invariante docId === token.
   */
  public async updateInvitation(token: string, data: Partial<Invitation>): Promise<void> {
    try {
      if (data.token && data.token !== token) {
        const oldSnap = await getDoc(doc(db, 'invitations', token));
        if (oldSnap.exists()) {
          const merged = { ...oldSnap.data(), ...data, id: data.token };
          await setDoc(doc(db, 'invitations', data.token), merged);
          await deleteDoc(doc(db, 'invitations', token));
          return;
        }
      }
      await updateDoc(doc(db, 'invitations', token), data);
    } catch (error) {
      console.error('Erro ao atualizar convite:', error);
      throw error;
    }
  }

  public async deleteInvitation(token: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'invitations', token));
    } catch (error) {
      console.error('Erro ao excluir convite:', error);
      throw error;
    }
  }

  // ========================
  // B2C WORKER MODE
  // ========================
  
  // Trabalhador Avulso
  public async loadTrabalhador(uid: string): Promise<TrabalhadorAvulso | null> {
    try {
      const docSnap = await getDoc(doc(db, 'trabalhadores', uid));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as TrabalhadorAvulso;
    } catch (error) {
      console.error('Erro ao carregar trabalhador:', error);
      return null;
    }
  }

  public async saveTrabalhador(trabalhador: TrabalhadorAvulso): Promise<void> {
    try {
      const docRef = doc(db, 'trabalhadores', trabalhador.id);
      await setDoc(docRef, trabalhador);
    } catch (error) {
      console.error('Erro ao salvar trabalhador:', error);
      throw error;
    }
  }

  // Obras Pessoais
  public async loadObrasPessoais(trabalhadorId: string): Promise<ObraPessoal[]> {
    try {
      const q = query(
        collection(db, 'obras_pessoais'),
        where('trabalhador_id', '==', trabalhadorId),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      const obras: ObraPessoal[] = [];
      snap.forEach((docSnap) => {
        obras.push({ id: docSnap.id, ...docSnap.data() } as ObraPessoal);
      });
      return obras;
    } catch (error) {
      console.error('Erro ao carregar obras pessoais:', error);
      return [];
    }
  }

  public async saveObraPessoal(obra: ObraPessoal): Promise<void> {
    try {
      const docRef = doc(db, 'obras_pessoais', obra.id);
      await setDoc(docRef, obra);
    } catch (error) {
      console.error('Erro ao salvar obra pessoal:', error);
      throw error;
    }
  }

  public async deleteObraPessoal(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'obras_pessoais', id));
    } catch (error) {
      console.error('Erro ao excluir obra pessoal:', error);
      throw error;
    }
  }

  // Sessões de Trabalho
  public async loadSessoesTrabalho(trabalhadorId: string, limitCount?: number): Promise<SessaoTrabalho[]> {
    try {
      const constraints: any[] = [
        where('trabalhador_id', '==', trabalhadorId),
        orderBy('data_hora', 'desc')
      ];
      if (limitCount) {
        constraints.push(limit(limitCount));
      }
      const q = query(collection(db, 'sessoes_trabalho'), ...constraints);
      const snap = await getDocs(q);
      const sessoes: SessaoTrabalho[] = [];
      snap.forEach((docSnap) => {
        sessoes.push({ id: docSnap.id, ...docSnap.data() } as SessaoTrabalho);
      });
      return sessoes;
    } catch (error) {
      console.error('Erro ao carregar sessões de trabalho:', error);
      return [];
    }
  }

  public async saveSessaoTrabalho(sessao: SessaoTrabalho): Promise<void> {
    try {
      const docRef = doc(db, 'sessoes_trabalho', sessao.id);
      await setDoc(docRef, sessao);

      // Criar RegistroPonto correspondente para que o dashboard admin veja em tempo real
      const [trabalhadorSnap, obraSnap] = await Promise.all([
        getDoc(doc(db, 'trabalhadores', sessao.trabalhador_id)),
        getDoc(doc(db, 'obras_pessoais', sessao.obra_id)),
      ]);
      const trabalhadorData = trabalhadorSnap.exists() ? trabalhadorSnap.data() : null;
      const obraData = obraSnap.exists() ? obraSnap.data() : null;

      const registroId = `REG_${sessao.id}`;
      const tipo: 'Check-in' | 'Check-out' =
        sessao.tipo === 'inicio' || sessao.tipo === 'pausa_fim' ? 'Check-in' : 'Check-out';

      const empresaId = obraData?.empresa_id || '';

      await setDoc(doc(db, 'registros', registroId), {
        id_funcionario: sessao.trabalhador_id,
        nome_funcionario: trabalhadorData?.nome || 'Trabalhador',
        id_local: sessao.obra_id,
        nome_local: obraData?.nome || 'Obra',
        empresa_id: empresaId,
        tipo,
        data_hora: sessao.data_hora,
        latitude_registro: sessao.latitude,
        longitude_registro: sessao.longitude,
        precisao_gps: 0,
        observacao: sessao.observacao || '',
        dentro_geofence: sessao.dentro_geofence,
        tipo_verificacao: 'GPS',
        foto_url: sessao.foto_url || '',
        auto: false,
      });
    } catch (error) {
      console.error('Erro ao salvar sessão de trabalho:', error);
      throw error;
    }
  }

  public async deleteSessaoTrabalho(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'sessoes_trabalho', id));
    } catch (error) {
      console.error('Erro ao excluir sessão de trabalho:', error);
      throw error;
    }
  }

  // Compartilhamentos
  public async loadCompartilhamentos(trabalhadorId: string): Promise<Compartilhamento[]> {
    try {
      const q = query(
        collection(db, 'compartilhamentos'),
        where('trabalhador_id', '==', trabalhadorId),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      const compartilhamentos: Compartilhamento[] = [];
      snap.forEach((docSnap) => {
        compartilhamentos.push({ id: docSnap.id, ...docSnap.data() } as Compartilhamento);
      });
      return compartilhamentos;
    } catch (error) {
      console.error('Erro ao carregar compartilhamentos:', error);
      return [];
    }
  }

  public async saveCompartilhamento(compartilhamento: Compartilhamento): Promise<void> {
    try {
      const docRef = doc(db, 'compartilhamentos', compartilhamento.id);
      await setDoc(docRef, compartilhamento);
    } catch (error) {
      console.error('Erro ao salvar compartilhamento:', error);
      throw error;
    }
  }

  public async loadCompartilhamentoById(id: string): Promise<Compartilhamento | null> {
    try {
      const docSnap = await getDoc(doc(db, 'compartilhamentos', id));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Compartilhamento;
    } catch (error) {
      console.error('Erro ao carregar compartilhamento:', error);
      return null;
    }
  }

  public async deleteCompartilhamento(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'compartilhamentos', id));
    } catch (error) {
      console.error('Erro ao excluir compartilhamento:', error);
      throw error;
    }
  }

  /** Escuta registros em tempo real (onSnapshot). Retorna unsubscribe. */
  public listenToRegistros(
    onData: (registros: RegistroPonto[]) => void,
    empresaId?: string,
  ): Unsubscribe {
    const tenantFilter: QueryConstraint[] = empresaId ? [where('empresa_id', '==', empresaId)] : [];
    return onSnapshot(
      query(collection(db, 'registros'), ...tenantFilter, orderBy('data_hora', 'desc')),
      (snap) => {
        const registros: RegistroPonto[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          registros.push({
            id_registro: docSnap.id,
            id_funcionario: data.id_funcionario || '',
            nome_funcionario: data.nome_funcionario || '',
            id_local: data.id_local || '',
            nome_local: data.nome_local || '',
            empresa_id: data.empresa_id,
            tipo: data.tipo || 'Check-in',
            data_hora: data.data_hora || '',
            latitude_registro: data.latitude_registro || 0,
            longitude_registro: data.longitude_registro || 0,
            observacao: data.observacao || '',
            precisao_gps: data.precisao_gps || 0,
            fotos: data.fotos || [],
            dentro_geofence: data.dentro_geofence,
            tipo_verificacao: data.tipo_verificacao || '',
            foto_url: data.foto_url || '',
            auto: data.auto || false,
          } as RegistroPonto);
        });
        onData(registros);
      },
      (error) => {
        console.error('Erro no listener de registros:', error);
      },
    );
  }

  /** Escuta locais em tempo real (onSnapshot). Retorna unsubscribe. */
  public listenToLocais(
    onData: (locais: LocalServico[]) => void,
    empresaId?: string,
  ): Unsubscribe {
    const tenantFilter: QueryConstraint[] = empresaId ? [where('empresa_id', '==', empresaId)] : [];
    return onSnapshot(
      query(collection(db, 'locais'), ...tenantFilter),
      (snap) => {
        const locais: LocalServico[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          locais.push({
            id_local: docSnap.id,
            empresa_id: data.empresa_id,
            nome_empresa: data.nome_empresa || '',
            cidade: data.cidade || '',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            raio_metros: data.raio_metros || 100,
            raio_auto_checkin: data.raio_auto_checkin,
          } as LocalServico);
        });
        onData(locais);
      },
      (error) => {
        console.error('Erro no listener de locais:', error);
      },
    );
  }

  /** Escuta funcionários em tempo real (onSnapshot). Retorna unsubscribe. */
  public listenToFuncionarios(
    onData: (funcionarios: Funcionario[]) => void,
    empresaId?: string,
  ): Unsubscribe {
    const tenantFilter: QueryConstraint[] = empresaId ? [where('empresa_id', '==', empresaId)] : [];
    return onSnapshot(
      query(collection(db, 'funcionarios'), ...tenantFilter),
      (snap) => {
        const funcionarios: Funcionario[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          funcionarios.push({
            id_funcionario: docSnap.id,
            empresa_id: data.empresa_id,
            nome: data.nome || '',
            cargo: data.cargo || '',
            status: data.status || 'Ativo',
            email: data.email,
          } as Funcionario);
        });
        onData(funcionarios);
      },
      (error) => {
        console.error('Erro no listener de funcionários:', error);
      },
    );
  }
}

export const firebaseService = new FirebaseService();
