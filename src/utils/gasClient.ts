/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Funcionario, LocalServico, RegistroPonto, AppDatabase, SystemConfig, Empresa, Venda, AccessKey, EmpresaAdmin, Invitation, TrabalhadorAvulso, ObraPessoal, SessaoTrabalho, Compartilhamento, WorkerDatabase } from '../types';
import { loadDatabase, saveDatabase } from '../data/db';
import { firebaseService } from './firebaseService';

const CONFIG_KEY = 'ponto_campo_config';

export function getSystemConfig(): SystemConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.mode) parsed.mode = 'firebase';
      return parsed;
    } catch {
      // Ignorar e retornar padrão
    }
  }
  return {
    gasUrl: '',
    mode: 'firebase',
    driveFolderId: '',
  };
}

export function saveSystemConfig(config: SystemConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function dedupBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export class DataService {
  private config: SystemConfig;
  private localDb: AppDatabase;

  constructor() {
    this.config = getSystemConfig();
    this.localDb = loadDatabase() || { funcionarios: [], locais: [], registros: [] };
  }

  public getConfig(): SystemConfig {
    return this.config;
  }

  public updateConfig(newConfig: SystemConfig) {
    this.config = newConfig;
    saveSystemConfig(newConfig);
  }

  /**
   * Carrega todos os dados. Em modo firebase, propaga erros para que a UI
   * possa reagir (ex.: mensagem de falha em vez de dados vazios silenciosos).
   * @param empresaId filtra por empresa (multi-tenant). Omitir = visão global/kiosk.
   */
  public async loadAllData(empresaId?: string, useCacheOnError: boolean = true): Promise<AppDatabase> {
    if (this.config.mode === 'firebase') {
      try {
        const firestoreData = await firebaseService.loadAllData(empresaId);
        // Só usa o Firestore como cache local quando não há filtro de tenant,
        // para não misturar dados de empresas diferentes no cache.
        if (!empresaId) {
          this.localDb = firestoreData;
          saveDatabase(firestoreData);
        }
        return firestoreData;
      } catch (error) {
        console.error('Falha ao carregar dados do Firebase.', error);
        if (useCacheOnError) return this.enrichRegistros(this.localDb);
        throw error;
      }
    }

    if (this.config.mode === 'gas' && this.config.gasUrl) {
      try {
        const response = await fetch(`${this.config.gasUrl}?action=get_data`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success') {
          let db: AppDatabase = {
            funcionarios: dedupBy(result.funcionarios || [], (f: Funcionario) => f.id_funcionario),
            locais: dedupBy(result.locais || [], (l: LocalServico) => l.id_local),
            registros: dedupBy(result.registros || [], (r: RegistroPonto) => r.id_registro),
          };
          if (empresaId) {
            db = {
              funcionarios: db.funcionarios.filter(f => f.empresa_id === empresaId),
              locais: db.locais.filter(l => l.empresa_id === empresaId),
              registros: db.registros.filter(r => r.empresa_id === empresaId),
            };
          }
          this.localDb = db;
          saveDatabase(db);
          return this.enrichRegistros(db);
        } else {
          throw new Error(result.message || 'Erro ao buscar dados do Google Sheets');
        }
      } catch (error) {
        console.warn('Falha na conexão com Google Sheets. Usando cache local temporariamente.', error);
        if (useCacheOnError) return this.enrichRegistros(this.localDb);
        throw error;
      }
    }

    return this.enrichRegistros(this.localDb);
  }

  /**
   * Registra ponto. IMPORTANTE: propaga erro do backend para que o check-in
   * NÃO exiba sucesso falso quando a gravação falha.
   */
  public async registrarPonto(registro: RegistroPonto): Promise<RegistroPonto> {
    const novoRegistro: RegistroPonto = { ...registro };

    const func = this.localDb.funcionarios.find(f => f.id_funcionario === novoRegistro.id_funcionario);
    const loc = this.localDb.locais.find(l => l.id_local === novoRegistro.id_local);
    novoRegistro.nome_funcionario = novoRegistro.nome_funcionario || (func ? func.nome : 'Funcionário Desconhecido');
    novoRegistro.nome_local = novoRegistro.nome_local || (loc ? loc.nome_empresa : 'Local Desconhecido');

    if (this.config.mode === 'firebase') {
      await firebaseService.registrarPonto(novoRegistro);
    }

    if (this.config.mode === 'gas' && this.config.gasUrl) {
      const response = await fetch(this.config.gasUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'add_registro',
          data: novoRegistro,
          driveFolderId: this.config.driveFolderId,
        }),
      });
      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Erro ao registrar ponto na planilha');
      }
    }

    if (!this.localDb.registros.some(r => r.id_registro === novoRegistro.id_registro)) {
      this.localDb.registros = [novoRegistro, ...this.localDb.registros];
    }
    saveDatabase(this.localDb);

    return novoRegistro;
  }

  public async cadastrarFuncionario(funcionario: Funcionario): Promise<Funcionario> {
    if (this.config.mode === 'firebase') {
      await firebaseService.cadastrarFuncionario(funcionario);
    }

    if (this.config.mode === 'gas' && this.config.gasUrl) {
      try {
        await fetch(this.config.gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'add_funcionario', data: funcionario }),
        });
      } catch (error) {
        console.error('Erro ao enviar funcionário para Google Sheets', error);
      }
    }

    if (!this.localDb.funcionarios.some(f => f.id_funcionario === funcionario.id_funcionario)) {
      this.localDb.funcionarios = [...this.localDb.funcionarios, funcionario];
    }
    saveDatabase(this.localDb);
    return funcionario;
  }

  public async excluirFuncionario(id: string, empresaId?: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      await firebaseService.excluirFuncionario(id, empresaId);
    }
    this.localDb.funcionarios = this.localDb.funcionarios.filter(f => f.id_funcionario !== id);
    saveDatabase(this.localDb);
  }

  public async cadastrarLocal(local: LocalServico): Promise<LocalServico> {
    if (this.config.mode === 'firebase') {
      await firebaseService.cadastrarLocal(local);
    }

    if (this.config.mode === 'gas' && this.config.gasUrl) {
      try {
        await fetch(this.config.gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'add_local', data: local }),
        });
      } catch (error) {
        console.error('Erro ao enviar local para Google Sheets', error);
      }
    }

    const existing = this.localDb.locais.findIndex(l => l.id_local === local.id_local);
    if (existing >= 0) {
      this.localDb.locais = this.localDb.locais.map(l => l.id_local === local.id_local ? local : l);
    } else {
      this.localDb.locais = [...this.localDb.locais, local];
    }
    saveDatabase(this.localDb);
    return local;
  }

  public async excluirLocal(id: string, empresaId?: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      await firebaseService.excluirLocal(id, empresaId);
    }
    this.localDb.locais = this.localDb.locais.filter(l => l.id_local !== id);
    saveDatabase(this.localDb);
  }

  public async toggleFuncionarioStatus(id: string, novoStatus: 'Ativo' | 'Inativo', empresaId?: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      await firebaseService.toggleFuncionarioStatus(id, novoStatus, empresaId);
    }

    if (this.config.mode === 'gas' && this.config.gasUrl) {
      try {
        await fetch(this.config.gasUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'toggle_funcionario', id_funcionario: id, status: novoStatus }),
        });
      } catch (error) {
        console.error('Erro ao alternar status no Google Sheets', error);
      }
    }

    this.localDb.funcionarios = this.localDb.funcionarios.map(f =>
      f.id_funcionario === id ? { ...f, status: novoStatus } : f
    );
    saveDatabase(this.localDb);
  }

  private enrichRegistros(db: AppDatabase): AppDatabase {
    const enriched = db.registros.map(reg => {
      const func = db.funcionarios.find(f => f.id_funcionario === reg.id_funcionario);
      const loc = db.locais.find(l => l.id_local === reg.id_local);
      return {
        ...reg,
        nome_funcionario: reg.nome_funcionario || (func ? func.nome : `Func. #${reg.id_funcionario}`),
        nome_local: reg.nome_local || (loc ? loc.nome_empresa : `Local #${reg.id_local}`),
      };
    });
    return { ...db, registros: enriched };
  }

  /** Remove todos os registros de ponto de uma empresa específica (local e remoto). */
  public async clearAllRegistros(empresaId?: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      await firebaseService.clearRegistros(empresaId);
    }
    if (empresaId) {
      this.localDb = { ...this.localDb, registros: this.localDb.registros.filter(r => r.empresa_id !== empresaId) };
    } else {
      this.localDb = { ...this.localDb, registros: [] };
    }
    saveDatabase(this.localDb);
  }

  public async loadConfig(): Promise<SystemConfig> {
    if (this.config.mode === 'firebase') {
      try {
        const config = await firebaseService.loadConfig();
        if (config) {
          this.config = { ...this.config, ...config };
          saveSystemConfig(this.config);
        }
      } catch (error) {
        console.error('Erro ao carregar config do Firebase:', error);
      }
    }
    return this.config;
  }

  public async saveConfig(config: SystemConfig): Promise<void> {
    this.config = config;
    saveSystemConfig(config);
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveConfig(config);
      } catch (error) {
        console.error('Erro ao salvar config no Firebase:', error);
      }
    }
  }

  // ========================
  // SaaS
  // ========================
  public async loadEmpresas(): Promise<Empresa[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadEmpresas();
      } catch (error) {
        console.error('Erro ao carregar empresas do Firebase:', error);
      }
    }
    return [];
  }

  public async saveEmpresa(empresa: Empresa): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveEmpresa(empresa);
      } catch (error) {
        console.error('Erro ao salvar empresa no Firebase:', error);
        throw error;
      }
    }
  }

  public async deleteEmpresa(id: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteEmpresa(id);
      } catch (error) {
        console.error('Erro ao deletar empresa no Firebase:', error);
        throw error;
      }
    }
  }

  public async loadVendas(): Promise<Venda[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadVendas();
      } catch (error) {
        console.error('Erro ao carregar vendas do Firebase:', error);
      }
    }
    return [];
  }

  public async loadAccessKeys(): Promise<AccessKey[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadAccessKeys();
      } catch (error) {
        console.error('Erro ao carregar chaves do Firebase:', error);
      }
    }
    return [];
  }

  public async saveAccessKey(key: AccessKey): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveAccessKey(key);
      } catch (error) {
        console.error('Erro ao salvar chave no Firebase:', error);
        throw error;
      }
    }
  }

  public async deleteAccessKey(id: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteAccessKey(id);
      } catch (error) {
        console.error('Erro ao deletar chave no Firebase:', error);
        throw error;
      }
    }
  }

  public async loadEmpresaAdmins(): Promise<EmpresaAdmin[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadEmpresaAdmins();
      } catch (error) {
        console.error('Erro ao carregar admins do Firebase:', error);
      }
    }
    return [];
  }

  public async saveEmpresaAdmin(admin: EmpresaAdmin): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveEmpresaAdmin(admin);
      } catch (error) {
        console.error('Erro ao salvar admin no Firebase:', error);
        throw error;
      }
    }
  }

  public async deleteEmpresaAdmin(uid: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteEmpresaAdmin(uid);
      } catch (error) {
        console.error('Erro ao deletar admin no Firebase:', error);
        throw error;
      }
    }
  }

  // ========================
  // INVITATIONS
  // ========================
  public async loadInvitations(empresaId?: string): Promise<Invitation[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadInvitations(empresaId);
      } catch (error) {
        console.error('Erro ao carregar convites do Firebase:', error);
      }
    }
    return [];
  }

  public async loadInvitationByToken(token: string): Promise<Invitation | null> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadInvitationByToken(token);
      } catch (error) {
        console.error('Erro ao buscar convite por token:', error);
      }
    }
    return null;
  }

  public async saveInvitation(invitation: Invitation): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveInvitation(invitation);
      } catch (error) {
        console.error('Erro ao salvar convite no Firebase:', error);
        throw error;
      }
    }
  }

  public async updateInvitation(token: string, data: Partial<Invitation>): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.updateInvitation(token, data);
      } catch (error) {
        console.error('Erro ao atualizar convite no Firebase:', error);
        throw error;
      }
    }
  }

  public async deleteInvitation(token: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteInvitation(token);
      } catch (error) {
        console.error('Erro ao deletar convite no Firebase:', error);
        throw error;
      }
    }
  }

  // ========================
  // B2C WORKER MODE
  // ========================
  
  private workerLocalDb: WorkerDatabase = {
    trabalhador: null,
    obras: [],
    sessoes: [],
    compartilhamentos: [],
  };

  // Trabalhador Avulso
  public async loadTrabalhador(uid: string): Promise<TrabalhadorAvulso | null> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadTrabalhador(uid);
      } catch (error) {
        console.error('Erro ao carregar trabalhador do Firebase:', error);
      }
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(`worker_${uid}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return this.workerLocalDb.trabalhador;
  }

  public async saveTrabalhador(trabalhador: TrabalhadorAvulso): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveTrabalhador(trabalhador);
      } catch (error) {
        console.error('Erro ao salvar trabalhador no Firebase:', error);
        throw error;
      }
    }
    this.workerLocalDb.trabalhador = trabalhador;
    localStorage.setItem(`worker_${trabalhador.id}`, JSON.stringify(trabalhador));
  }

  // Obras Pessoais
  public async loadObrasPessoais(trabalhadorId: string): Promise<ObraPessoal[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadObrasPessoais(trabalhadorId);
      } catch (error) {
        console.error('Erro ao carregar obras pessoais do Firebase:', error);
      }
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(`worker_obras_${trabalhadorId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return this.workerLocalDb.obras.filter(o => o.trabalhador_id === trabalhadorId);
  }

  public async saveObraPessoal(obra: ObraPessoal): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveObraPessoal(obra);
      } catch (error) {
        console.error('Erro ao salvar obra pessoal no Firebase:', error);
        throw error;
      }
    }
    const existingIndex = this.workerLocalDb.obras.findIndex(o => o.id === obra.id);
    if (existingIndex >= 0) {
      this.workerLocalDb.obras[existingIndex] = obra;
    } else {
      this.workerLocalDb.obras.push(obra);
    }
    localStorage.setItem(`worker_obras_${obra.trabalhador_id}`, JSON.stringify(this.workerLocalDb.obras.filter(o => o.trabalhador_id === obra.trabalhador_id)));
  }

  public async deleteObraPessoal(id: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteObraPessoal(id);
      } catch (error) {
        console.error('Erro ao excluir obra pessoal no Firebase:', error);
        throw error;
      }
    }
    const obra = this.workerLocalDb.obras.find(o => o.id === id);
    if (obra) {
      this.workerLocalDb.obras = this.workerLocalDb.obras.filter(o => o.id !== id);
      localStorage.setItem(`worker_obras_${obra.trabalhador_id}`, JSON.stringify(this.workerLocalDb.obras.filter(o => o.trabalhador_id === obra.trabalhador_id)));
    }
  }

  // Sessões de Trabalho
  public async loadSessoesTrabalho(trabalhadorId: string, limitCount?: number): Promise<SessaoTrabalho[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadSessoesTrabalho(trabalhadorId, limitCount);
      } catch (error) {
        console.error('Erro ao carregar sessões de trabalho do Firebase:', error);
      }
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(`worker_sessoes_${trabalhadorId}`);
    let sessoes: SessaoTrabalho[] = [];
    if (stored) {
      try {
        sessoes = JSON.parse(stored);
      } catch {
        sessoes = [];
      }
    }
    sessoes = [...sessoes, ...this.workerLocalDb.sessoes.filter(s => s.trabalhador_id === trabalhadorId)];
    sessoes.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
    if (limitCount) {
      sessoes = sessoes.slice(0, limitCount);
    }
    return sessoes;
  }

  public async saveSessaoTrabalho(sessao: SessaoTrabalho): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveSessaoTrabalho(sessao);
      } catch (error) {
        console.error('Erro ao salvar sessão de trabalho no Firebase:', error);
        throw error;
      }
    }
    const existingIndex = this.workerLocalDb.sessoes.findIndex(s => s.id === sessao.id);
    if (existingIndex >= 0) {
      this.workerLocalDb.sessoes[existingIndex] = sessao;
    } else {
      this.workerLocalDb.sessoes.push(sessao);
    }
    localStorage.setItem(`worker_sessoes_${sessao.trabalhador_id}`, JSON.stringify(this.workerLocalDb.sessoes.filter(s => s.trabalhador_id === sessao.trabalhador_id)));
  }

  public async deleteSessaoTrabalho(id: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteSessaoTrabalho(id);
      } catch (error) {
        console.error('Erro ao excluir sessão de trabalho no Firebase:', error);
        throw error;
      }
    }
    const sessao = this.workerLocalDb.sessoes.find(s => s.id === id);
    if (sessao) {
      this.workerLocalDb.sessoes = this.workerLocalDb.sessoes.filter(s => s.id !== id);
      localStorage.setItem(`worker_sessoes_${sessao.trabalhador_id}`, JSON.stringify(this.workerLocalDb.sessoes.filter(s => s.trabalhador_id === sessao.trabalhador_id)));
    }
  }

  // Compartilhamentos
  public async loadCompartilhamentos(trabalhadorId: string): Promise<Compartilhamento[]> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadCompartilhamentos(trabalhadorId);
      } catch (error) {
        console.error('Erro ao carregar compartilhamentos do Firebase:', error);
      }
    }
    const stored = localStorage.getItem(`worker_compartilhamentos_${trabalhadorId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return this.workerLocalDb.compartilhamentos.filter(c => c.trabalhador_id === trabalhadorId);
  }

  public async saveCompartilhamento(compartilhamento: Compartilhamento): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.saveCompartilhamento(compartilhamento);
      } catch (error) {
        console.error('Erro ao salvar compartilhamento no Firebase:', error);
        throw error;
      }
    }
    const existingIndex = this.workerLocalDb.compartilhamentos.findIndex(c => c.id === compartilhamento.id);
    if (existingIndex >= 0) {
      this.workerLocalDb.compartilhamentos[existingIndex] = compartilhamento;
    } else {
      this.workerLocalDb.compartilhamentos.push(compartilhamento);
    }
    localStorage.setItem(`worker_compartilhamentos_${compartilhamento.trabalhador_id}`, JSON.stringify(this.workerLocalDb.compartilhamentos.filter(c => c.trabalhador_id === compartilhamento.trabalhador_id)));
  }

   public async loadCompartilhamentoById(id: string): Promise<Compartilhamento | null> {
    if (this.config.mode === 'firebase') {
      try {
        return await firebaseService.loadCompartilhamentoById(id);
      } catch (error) {
        console.error('Erro ao carregar compartilhamento do Firebase:', error);
      }
    }
    return this.workerLocalDb.compartilhamentos.find(c => c.id === id) || null;
  }

  public async deleteCompartilhamento(id: string): Promise<void> {
    if (this.config.mode === 'firebase') {
      try {
        await firebaseService.deleteCompartilhamento(id);
      } catch (error) {
        console.error('Erro ao excluir compartilhamento no Firebase:', error);
        throw error;
      }
    }
    this.workerLocalDb.compartilhamentos = this.workerLocalDb.compartilhamentos.filter(c => c.id !== id);
    const allStored = this.workerLocalDb.compartilhamentos;
    if (allStored.length > 0) {
      const byWorker = allStored.reduce((acc: Record<string, Compartilhamento[]>, c) => {
        (acc[c.trabalhador_id] = acc[c.trabalhador_id] || []).push(c);
        return acc;
      }, {});
      Object.entries(byWorker).forEach(([uid, items]) => {
        localStorage.setItem(`worker_compartilhamentos_${uid}`, JSON.stringify(items));
      });
    }
  }

  // ── Listeners em tempo real ─────────────────────────────────────────────

  /** Escuta registros em tempo real (onSnapshot). Só suportado no modo Firebase. */
  public listenToRegistros(
    onData: (registros: RegistroPonto[]) => void,
    empresaId?: string,
  ): () => void {
    if (this.config.mode === 'firebase') {
      return firebaseService.listenToRegistros(onData, empresaId);
    }
    // Modo GAS/local: polling fallback (30s)
    const poll = async () => {
      const d = await this.loadAllData(empresaId, false);
      onData(d.registros);
    };
    poll();
    const intervalId = setInterval(poll, 30000);
    return () => clearInterval(intervalId);
  }

  /** Escuta locais em tempo real (onSnapshot). Só suportado no modo Firebase. */
  public listenToLocais(
    onData: (locais: LocalServico[]) => void,
    empresaId?: string,
  ): () => void {
    if (this.config.mode === 'firebase') {
      return firebaseService.listenToLocais(onData, empresaId);
    }
    const poll = async () => {
      const d = await this.loadAllData(empresaId, false);
      onData(d.locais);
    };
    poll();
    const intervalId = setInterval(poll, 30000);
    return () => clearInterval(intervalId);
  }

  /** Escuta funcionários em tempo real (onSnapshot). Só suportado no modo Firebase. */
  public listenToFuncionarios(
    onData: (funcionarios: Funcionario[]) => void,
    empresaId?: string,
  ): () => void {
    if (this.config.mode === 'firebase') {
      return firebaseService.listenToFuncionarios(onData, empresaId);
    }
    const poll = async () => {
      const d = await this.loadAllData(empresaId, false);
      onData(d.funcionarios);
    };
    poll();
    const intervalId = setInterval(poll, 30000);
    return () => clearInterval(intervalId);
  }
}

export const dataService = new DataService();
