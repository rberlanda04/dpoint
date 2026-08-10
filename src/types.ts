/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'empresa_admin' | 'funcionario' | 'trabalhador_avulso' | 'none';

export interface Funcionario {
  id_funcionario: string;
  empresa_id?: string;
  nome: string;
  cargo: string;
  status: 'Ativo' | 'Inativo';
  email?: string;
  matricula?: string;
}

export interface LocalServico {
  id_local: string;
  empresa_id?: string;
  nome_empresa: string;
  cidade: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  raio_auto_checkin?: number; // raio para auto check-in/out (padrão = raio_metros)
}

export interface RegistroPonto {
  id_registro: string;
  id_funcionario: string;
  nome_funcionario?: string;
  id_local: string;
  nome_local?: string;
  empresa_id?: string;
  tipo: 'Check-in' | 'Check-out';
  data_hora: string;
  latitude_registro: number;
  longitude_registro: number;
  observacao: string;
  precisao_gps: number;
  fotos?: string[];
  dentro_geofence?: boolean;
  tipo_verificacao?: string;
  foto_url?: string;
  auto?: boolean; // true se foi auto check-in/out por geofence
}

export interface SystemConfig {
  id?: string;
  gasUrl?: string;
  gas_web_app_url?: string;
  mode: 'gas' | 'firebase';
  driveFolderId?: string;
  use_geolocation?: boolean;
  use_qr_code?: boolean;
  use_camera_photo?: boolean;
  use_online_api?: boolean;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  plano: 'bronze' | 'prata' | 'ouro';
  status: string;
  data_contratacao: string;
  empresa_pai?: string;
}

export interface EmpresaAdmin {
  uid: string;
  email: string;
  nome: string;
  empresa_id: string;
  empresa_nome?: string;
  api_key?: string;
  role: 'empresa_admin';
  ativo: boolean;
  data_criacao: string;
}

export interface Venda {
  id: string;
  empresa_id: string;
  plano: string;
  valor_total: number;
  comissao_dpoint: number;
  data: string;
  status: string;
}

export interface AccessKey {
  id: string;
  empresa_id: string;
  empresa_nome?: string;
  chave: string;
  nome: string;
  ativa: boolean;
  data_criacao: string;
  ultima_leitura?: string;
  permissoes: ('registros' | 'funcionarios' | 'locais' | 'relatorios')[];
}

export interface AppDatabase {
  funcionarios: Funcionario[];
  locais: LocalServico[];
  registros: RegistroPonto[];
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  nome?: string;
  empresa_id: string;
  empresa_nome?: string;
  role: 'empresa_admin' | 'funcionario';
  status: 'pending' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
  created_by: string;
  used_at?: string;
}

// ===== B2C Worker Mode =====

export interface TrabalhadorAvulso {
  id: string;              // Firebase UID
  nome: string;
  foto_url?: string;
  profissao: string;       // ex: "Pedreiro", "Eletricista", "Pintor"
  valor_hora: number;      // média de pagamento por hora
  telefone?: string;
  created_at: string;
  updated_at: string;
}

export interface ObraPessoal {
  id: string;
  trabalhador_id: string;
  nome: string;            // ex: "Obra Residencial - Rua das Flores"
  endereco: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  cliente?: string;        // nome do cliente/contratante
  valor_hora?: number;     // override do valor padrão
  ativa: boolean;
  created_at: string;
}

export interface SessaoTrabalho {
  id: string;
  trabalhador_id: string;
  obra_id: string;
  tipo: 'inicio' | 'fim' | 'pausa_inicio' | 'pausa_fim';
  data_hora: string;
  latitude: number;
  longitude: number;
  dentro_geofence: boolean;
  observacao?: string;
  foto_url?: string;
}

export interface ResumoDiario {
  data: string;            // YYYY-MM-DD
  horas_trabalhadas: number;
  ganho_estimado: number;
  obras: string[];         // IDs das obras trabalhadas no dia
}

export interface Compartilhamento {
  id: string;
  trabalhador_id: string;
  tipo: 'resumo_semanal' | 'resumo_mensal' | 'conquista' | 'sessao';
  conteudo: any;           // JSON com dados para gerar card de compartilhamento
  imagem_url?: string;     // Card gerado para redes sociais
  created_at: string;
}

// Extended AppDatabase for worker mode
export interface WorkerDatabase {
  trabalhador: TrabalhadorAvulso | null;
  obras: ObraPessoal[];
  sessoes: SessaoTrabalho[];
  compartilhamentos: Compartilhamento[];
}
