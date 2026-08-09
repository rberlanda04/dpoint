import React, { useState, useEffect } from 'react';
import {
  Clock,
  Building,
  ArrowLeft,
  Plus,
  Filter,
  Download,
  BarChart3,
  Shield,
  CheckCircle2,
  FileText,
  Tag,
  Send,
  Users,
  Search,
  TrendingUp,
  Calendar,
  Eye,
  ChevronDown,
  Share2,
  Link2,
  Mail,
  Printer,
  RefreshCw,
  Briefcase,
  Activity,
  Zap,
  Globe,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { RegistroPonto, LocalServico, Funcionario } from '../types';
import { dataService } from '../utils/gasClient';

// Import images
import img1 from '../imgs/construction-worker-with-document-plan-working-inside-building-construction-site.jpg';
import img2 from '../imgs/front-view-woman-working-as-engineer.jpg';
import img3 from '../imgs/medium-shot-woman-working-as-engineer.jpg';
import img4 from '../imgs/construction-worker-using-hammer-job-site.jpg';
import img5 from '../imgs/businessmen-hands-white-table-with-documents-drafts.jpg';
import img6 from '../imgs/worker-is-cutting-wires-with-lineman-s-pliers.jpg';

interface B2bCompany {
  id: string;
  nome: string;
  empresa_id: string;
  cnpj: string;
  email: string;
  status: 'ativo' | 'inativo';
  funcionarioCount: number;
}

interface HourSummary {
  funcionario: Funcionario;
  registros: RegistroPonto[];
  totalHoras: number;
  horaEntrada: string | null;
  horaSaida: string | null;
}

export default function B2bPage() {
  const navigate = useNavigate();
  const { empresaAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { t, lang } = useI18n();
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  const [companies, setCompanies] = useState<B2bCompany[]>([]);
  const [locais, setLocais] = useState<LocalServico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'empresas' | 'horas'>('empresas');

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  useEffect(() => {
    const unsubRegistros = dataService.listenToRegistros((regs) => {
      setRegistros(regs);
    }, empresaId);

    const unsubFuncionarios = dataService.listenToFuncionarios((funcs) => {
      setFuncionarios(funcs);
      setLoading(false);
    }, empresaId);

    const unsubLocais = dataService.listenToLocais((locs) => {
      setLocais(locs);
    }, empresaId);

    return () => { unsubRegistros(); unsubFuncionarios(); unsubLocais(); };
  }, [empresaId]);

  useEffect(() => {
    if (funcionarios.length > 0 && locais.length > 0) {
      const empresasMap = new Map<string, B2bCompany>();
      funcionarios.forEach(f => {
        const eid = f.empresa_id || '';
        if (!empresasMap.has(eid)) {
          empresasMap.set(eid, {
            id: eid,
            nome: f.empresa_id ? f.empresa_id : 'Sem empresa',
            empresa_id: f.empresa_id || '',
            cnpj: '',
            email: f.email || '',
            status: 'ativo',
            funcionarioCount: 0,
          });
        }
        const comp = empresasMap.get(eid)!;
        comp.funcionarioCount += 1;
      });

      const empresasList = Array.from(empresasMap.values()).sort((a, b) =>
        b.funcionarioCount - a.funcionarioCount
      );
      setCompanies(empresasList);
      if (!selectedCompany && empresasList.length > 0 && !empresaId) {
        setSelectedCompany(empresasList[0].empresa_id);
      }
    }
  }, [funcionarios, locais, selectedCompany, empresaId]);

  const getHourSummaries = (): HourSummary[] => {
    const empId = selectedCompany || empresaId;
    const filteredRegs = empId
      ? registros.filter(r => r.empresa_id === empId)
      : registros;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let startDate = todayStr;
    if (periodo === 'semana') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split('T')[0];
    } else if (periodo === 'mes') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString().split('T')[0];
    }

    const periodoRegs = filteredRegs.filter(r => r.data_hora >= startDate);

    const byFuncionario = new Map<string, RegistroPonto[]>();
    periodoRegs.forEach(r => {
      const arr = byFuncionario.get(r.id_funcionario) || [];
      arr.push(r);
      byFuncionario.set(r.id_funcionario, arr);
    });

    const summaries: HourSummary[] = [];
    byFuncionario.forEach((regs, funcId) => {
      const func = funcionarios.find(f => f.id_funcionario === funcId);
      if (!func) return;
      const sorted = regs.sort((a, b) =>
        new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      );

      let totalHoras = 0;
      let horaEntrada: string | null = null;
      let horaSaida: string | null = null;

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        if (r.tipo === 'Check-in' && i + 1 < sorted.length) {
          const next = sorted[i + 1];
          if (next.tipo === 'Check-out') {
            const diff = (new Date(next.data_hora).getTime() - new Date(r.data_hora).getTime()) / (1000 * 60 * 60);
            totalHoras += diff > 0 ? diff : 0;
            if (!horaEntrada) horaEntrada = r.data_hora;
            horaSaida = next.data_hora;
          }
        }
        if (r.tipo === 'Check-in' && !horaEntrada) horaEntrada = r.data_hora;
        if (r.tipo === 'Check-out') horaSaida = r.data_hora;
      }

      summaries.push({
        funcionario: func,
        registros: sorted,
        totalHoras: Math.round(totalHoras * 10) / 10,
        horaEntrada,
        horaSaida,
      });
    });

    return summaries;
  };

  const hourSummaries = getHourSummaries();
  const horasFiltradas = hourSummaries.filter(s => {
    const q = search.toLowerCase();
    return s.funcionario.nome.toLowerCase().includes(q) ||
           s.funcionario.id_funcionario.toLowerCase().includes(q);
  });

  const formatHora = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmitShare = () => {
    setShowShareModal(false);
    alert(t('b2b.shareSuccess') || 'Link de compartilhamento gerado!');
    setShareEmail('');
  };

  const totalHorasGeral = Math.round(hourSummaries.reduce((sum, s) => sum + s.totalHoras, 0) * 10) / 10;
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'Ativo').length;

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" />;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              B2B Manager
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('landing.login')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="absolute inset-0 opacity-20">
          <img src={img5} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur-sm">
                <Lock className="w-3.5 h-3.5" />
                Modelo B2B Fechado e Restrito
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4 leading-tight">
                Gestão e Compartilhamento de{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Horas Trabalhadas</span>
              </h1>
              <p className="text-lg text-white/70 max-w-xl leading-relaxed">
                Plataforma exclusiva para empresas cadastradas. Gerencie horas trabalhadas,
                acompanhe registros de ponto em tempo real e compartilhe relatórios
                entre equipes de forma segura e controlada.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  onClick={() => setActiveTab('horas')}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer border-0"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver Horas
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="bg-white/10 text-white font-semibold px-6 py-3 rounded-xl text-sm border border-white/20 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar
                </button>
              </div>
            </div>
            {/* Hero visual */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img src={img2} alt="Gestão B2B" className="w-full h-64 object-cover" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Relatório pronto</p>
                    <p className="text-xs text-slate-400">Exportado automaticamente</p>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{funcionariosAtivos} ativos</p>
                    <p className="text-xs text-slate-400">Funcionários</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Empresas</p>
                <p className="text-xl font-bold text-slate-900">{companies.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Registros</p>
                <p className="text-xl font-bold text-slate-900">{registros.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Funcionários</p>
                <p className="text-xl font-bold text-slate-900">{funcionariosAtivos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Horas</p>
                <p className="text-xl font-bold text-slate-900">{totalHorasGeral}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('empresas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-0 ${
              activeTab === 'empresas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building className="w-4 h-4" />
            Empresas Cadastradas
          </button>
          <button
            onClick={() => setActiveTab('horas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-0 ${
              activeTab === 'horas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Horas Trabalhadas
          </button>
        </div>

        {/* Companies Section */}
        {activeTab === 'empresas' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Empresas Cadastradas</h2>
                    <p className="text-xs text-slate-500">{companies.length} empresas no sistema</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  {empresaId ? null : (
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">Todas as empresas</option>
                      {companies.map(c => (
                        <option key={c.empresa_id} value={c.empresa_id}>{c.nome} ({c.funcionarioCount})</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer border-0 bg-transparent"
                  >
                    <Send className="w-4 h-4" />
                    Compartilhar
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="py-3 px-5 text-slate-600 font-medium">Empresa</th>
                    <th className="py-3 px-5 text-slate-600 font-medium">CNPJ</th>
                    <th className="py-3 px-5 text-slate-600 font-medium text-center">Funcionários</th>
                    <th className="py-3 px-5 text-slate-600 font-medium text-center">Status</th>
                    <th className="py-3 px-5 text-slate-600 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map(c => (
                    <tr key={c.empresa_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-sky-100 rounded-xl flex items-center justify-center">
                            <Building className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="font-semibold text-slate-800">{c.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-mono text-xs">{c.cnpj || '-'}</td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <Users className="w-3 h-3" />
                          {c.funcionarioCount}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {c.status === 'ativo' ? <CheckCircle2 className="w-3 h-3" /> : null}
                          {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => setSelectedCompany(c.empresa_id)}
                          className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer border-0 bg-transparent"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {companies.length === 0 && (
              <div className="py-12 text-center">
                <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma empresa cadastrada</p>
              </div>
            )}
          </div>
        )}

        {/* Hours Section */}
        {activeTab === 'horas' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Horas Trabalhadas</h2>
                    <p className="text-xs text-slate-500">{horasFiltradas.length} funcionários no período</p>
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar funcionário..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48"
                    />
                  </div>
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value as any)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="hoje">Hoje</option>
                    <option value="semana">Últimos 7 dias</option>
                    <option value="mes">Últimos 30 dias</option>
                  </select>
                  <button
                    onClick={() => {
                      const csv = [
                        ['Funcionário', 'Matrícula', 'Horas', 'Entrada', 'Saída'],
                        ...horasFiltradas.map(s => [
                          s.funcionario.nome,
                          s.funcionario.id_funcionario,
                          `${s.totalHoras}h`,
                          formatHora(s.horaEntrada),
                          formatHora(s.horaSaida)
                        ])
                      ].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'horas_trabalhadas.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all cursor-pointer border-0 bg-transparent"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-5 font-medium text-slate-600">Funcionário</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Matrícula</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Horas</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Entrada</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Saída</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Registros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {horasFiltradas.map((s) => (
                    <tr key={s.funcionario.id_funcionario} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-sky-100 rounded-xl flex items-center justify-center">
                            <span className="text-sm font-bold text-indigo-600">
                              {s.funcionario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-800">{s.funcionario.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center text-slate-600 font-mono text-xs">
                        {s.funcionario.id_funcionario}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          {s.totalHoras}h
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center text-slate-600">
                        {formatHora(s.horaEntrada)}
                      </td>
                      <td className="py-4 px-5 text-center text-slate-600">
                        {formatHora(s.horaSaida)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {s.registros.length} registros
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {horasFiltradas.length === 0 && (
              <div className="py-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Nenhum funcionário com horas registradas no período selecionado.</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Gallery */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="relative rounded-xl overflow-hidden h-24 group">
            <img src={img1} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-2">
              <p className="text-white text-xs font-semibold">Construção</p>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden h-24 group">
            <img src={img3} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-2">
              <p className="text-white text-xs font-semibold">Engenharia</p>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden h-24 group">
            <img src={img4} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-2">
              <p className="text-white text-xs font-semibold">Field Work</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Compartilhar Relatório B2B</h3>
                <p className="text-xs text-slate-500">Enviar para outro departamento ou empresa</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email do destinatário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitShare}
                disabled={!shareEmail}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all cursor-pointer border-0 bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
