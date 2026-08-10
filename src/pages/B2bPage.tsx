import React, { useState, useEffect } from 'react';
import {
  Clock,
  Building,
  Plus,
  Download,
  BarChart3,
  CheckCircle2,
  Users,
  Search,
  Share2,
  Send,
  Mail,
  Briefcase,
  Activity,
  FileText,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { RegistroPonto, LocalServico, Funcionario, EmpresaAdmin } from '../types';
import { dataService } from '../utils/gasClient';
import PageHeader from '../components/layouts/PageHeader';
import GridLineCard from '../components/ui/GridLineCard';
import MetricCard from '../components/ui/MetricCard';

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
  const { empresaAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { t, lang } = useI18n();
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  const [companies, setCompanies] = useState<B2bCompany[]>([]);
  const [locais, setLocais] = useState<LocalServico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'empresas' | 'horas'>('empresas');
  const [empresaAdmins, setEmpresaAdmins] = useState<EmpresaAdmin[]>([]);

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

    dataService.loadEmpresaAdmins().then(admins => {
      setEmpresaAdmins(admins);
    });

    return () => { unsubRegistros(); unsubFuncionarios(); unsubLocais(); };
  }, [empresaId]);

  useEffect(() => {
    if (funcionarios.length > 0 && locais.length > 0) {
      const empresasMap = new Map<string, B2bCompany>();
      funcionarios.forEach(f => {
        const eid = f.empresa_id || '';
        if (!empresasMap.has(eid)) {
          const admin = empresaAdmins.find(a => a.empresa_id === eid);
          const nomeEmpresa = admin?.nome_empresa || eid || (lang === 'pt' ? 'Sem empresa' : 'No company');
          empresasMap.set(eid, {
            id: eid,
            nome: nomeEmpresa,
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
  }, [funcionarios, locais, selectedCompany, empresaId, empresaAdmins, lang]);

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

  const totalHorasGeral = Math.round(hourSummaries.reduce((sum, s) => sum + s.totalHoras, 0) * 10) / 10;
  const funcionariosAtivos = funcionarios.filter(f => f.status === 'Ativo').length;

  const handleExportCSV = () => {
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
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" />;

  return (
    <div className="p-4 lg:p-8">
      <PageHeader
        title="B2B Portal"
        subtitle={lang === 'pt' ? 'Gestão e compartilhamento de horas trabalhadas' : 'Work hours management and sharing'}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-8">
        <MetricCard
          label={lang === 'pt' ? 'Empresas' : 'Companies'}
          value={companies.length}
          icon={Building}
          color="indigo"
        />
        <MetricCard
          label={lang === 'pt' ? 'Registros' : 'Records'}
          value={registros.length}
          icon={FileText}
          color="emerald"
        />
        <MetricCard
          label={lang === 'pt' ? 'Funcionários' : 'Employees'}
          value={funcionariosAtivos}
          icon={Users}
          color="sky"
        />
        <MetricCard
          label={lang === 'pt' ? 'Total Horas' : 'Total Hours'}
          value={`${totalHorasGeral}h`}
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 mb-5 lg:mb-6 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('empresas')}
          className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer border-0 ${
            activeTab === 'empresas'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-transparent text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          {lang === 'pt' ? 'Empresas' : 'Companies'}
        </button>
        <button
          onClick={() => setActiveTab('horas')}
          className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer border-0 ${
            activeTab === 'horas'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-transparent text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          {lang === 'pt' ? 'Horas' : 'Hours'}
        </button>
      </div>

      {/* Companies Section */}
      {activeTab === 'empresas' && (
        <GridLineCard padding="none">
          <div className="p-4 lg:p-5 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-sm lg:text-base font-bold text-slate-900">{lang === 'pt' ? 'Empresas Cadastradas' : 'Registered Companies'}</h2>
                  <p className="text-[11px] text-slate-500">{companies.length} {lang === 'pt' ? 'empresas' : 'companies'}</p>
                </div>
              </div>
              {!empresaId && companies.length > 1 && (
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="text-xs lg:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-auto"
                >
                  <option value="">{lang === 'pt' ? 'Todas' : 'All'}</option>
                  {companies.map(c => (
                    <option key={c.empresa_id} value={c.empresa_id}>{c.nome} ({c.funcionarioCount})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Mobile: Card layout */}
          <div className="lg:hidden divide-y divide-slate-100">
            {companies.length === 0 ? (
              <div className="py-12 text-center">
                <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{lang === 'pt' ? 'Nenhuma empresa cadastrada' : 'No companies registered'}</p>
              </div>
            ) : (
              companies.map(c => (
                <div key={c.empresa_id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-sky-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{c.nome}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{c.cnpj || '-'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.status === 'ativo' ? (lang === 'pt' ? 'Ativo' : 'Active') : (lang === 'pt' ? 'Inativo' : 'Inactive')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                      <Users className="w-3 h-3" />
                      {c.funcionarioCount} {lang === 'pt' ? 'funcs' : 'emps'}
                    </span>
                    <button
                      onClick={() => setSelectedCompany(c.empresa_id)}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer border-0 bg-transparent"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {lang === 'pt' ? 'Ver' : 'View'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="py-3 px-5 text-slate-600 font-medium">{lang === 'pt' ? 'Empresa' : 'Company'}</th>
                  <th className="py-3 px-5 text-slate-600 font-medium">CNPJ</th>
                  <th className="py-3 px-5 text-slate-600 font-medium text-center">{lang === 'pt' ? 'Funcionários' : 'Employees'}</th>
                  <th className="py-3 px-5 text-slate-600 font-medium text-center">Status</th>
                  <th className="py-3 px-5 text-slate-600 font-medium text-center">{lang === 'pt' ? 'Ações' : 'Actions'}</th>
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
                        c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
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
        </GridLineCard>
      )}

      {/* Hours Section */}
      {activeTab === 'horas' && (
        <GridLineCard padding="none">
          <div className="p-4 lg:p-5 border-b border-slate-100">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm lg:text-base font-bold text-slate-900">{lang === 'pt' ? 'Horas Trabalhadas' : 'Work Hours'}</h2>
                  <p className="text-[11px] text-slate-500">{horasFiltradas.length} {lang === 'pt' ? 'funcionários' : 'employees'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[140px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'pt' ? 'Buscar...' : 'Search...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-xs lg:text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value as any)}
                  className="text-xs lg:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="hoje">{lang === 'pt' ? 'Hoje' : 'Today'}</option>
                  <option value="semana">{lang === 'pt' ? '7 dias' : '7 days'}</option>
                  <option value="mes">{lang === 'pt' ? '30 dias' : '30 days'}</option>
                </select>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 text-xs lg:text-sm font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all cursor-pointer border-0 bg-transparent"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>
          </div>

          {/* Mobile: Card layout */}
          <div className="lg:hidden divide-y divide-slate-100">
            {horasFiltradas.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{lang === 'pt' ? 'Nenhum registro no período' : 'No records in this period'}</p>
              </div>
            ) : (
              horasFiltradas.map((s) => (
                <div key={s.funcionario.id_funcionario} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-sky-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-indigo-600">
                        {s.funcionario.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.funcionario.nome}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{s.funcionario.id_funcionario}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                      <Clock className="w-3 h-3" />
                      {s.totalHoras}h
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 ml-[52px]">
                    <span>{lang === 'pt' ? 'Entrada' : 'In'}: <strong className="text-slate-700">{formatHora(s.horaEntrada)}</strong></span>
                    <span>{lang === 'pt' ? 'Saída' : 'Out'}: <strong className="text-slate-700">{formatHora(s.horaSaida)}</strong></span>
                    <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {s.registros.length} {lang === 'pt' ? 'regs' : 'regs'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-5 font-medium text-slate-600">{lang === 'pt' ? 'Funcionário' : 'Employee'}</th>
                  <th className="text-center py-3 px-5 font-medium text-slate-600">Matrícula</th>
                  <th className="text-center py-3 px-5 font-medium text-slate-600">{lang === 'pt' ? 'Horas' : 'Hours'}</th>
                  <th className="text-center py-3 px-5 font-medium text-slate-600">{lang === 'pt' ? 'Entrada' : 'Check-in'}</th>
                  <th className="text-center py-3 px-5 font-medium text-slate-600">{lang === 'pt' ? 'Saída' : 'Check-out'}</th>
                  <th className="text-center py-3 px-5 font-medium text-slate-600">{lang === 'pt' ? 'Registros' : 'Records'}</th>
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
                    <td className="py-4 px-5 text-center text-slate-600 font-mono text-xs">{s.funcionario.id_funcionario}</td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Clock className="w-3 h-3" />
                        {s.totalHoras}h
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center text-slate-600">{formatHora(s.horaEntrada)}</td>
                    <td className="py-4 px-5 text-center text-slate-600">{formatHora(s.horaSaida)}</td>
                    <td className="py-4 px-5 text-center">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {s.registros.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GridLineCard>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{lang === 'pt' ? 'Compartilhar Relatório' : 'Share Report'}</h3>
                <p className="text-[11px] text-slate-500">{lang === 'pt' ? 'Enviar para outro departamento' : 'Send to another department'}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                {lang === 'pt' ? 'Email do destinatário' : 'Recipient email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="nome@empresa.com"
                  className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { setShowShareModal(false); setShareEmail(''); }}
                disabled={!shareEmail}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all cursor-pointer border-0 bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {lang === 'pt' ? 'Enviar' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
