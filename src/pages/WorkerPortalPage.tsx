import React, { useState, useEffect } from 'react';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  TrendingUp,
  Calendar,
  BarChart3,
  Wallet,
  Download,
  Mail,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  PieChart,
  DollarSign,
  Briefcase,
  Target,
  Zap,
  Globe,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GridLineCard from '../components/ui/GridLineCard';
import MetricCard from '../components/ui/MetricCard';
import ChartCard from '../components/ui/ChartCard';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { RegistroPonto, Funcionario } from '../types';
import { dataService } from '../utils/gasClient';

import img2 from '../imgs/front-view-woman-working-as-engineer.jpg';
import img5 from '../imgs/businessmen-hands-white-table-with-documents-drafts.jpg';

interface HourEntry {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  hours: number;
  description: string;
}

interface EarningsConfig {
  hourlyRate: number;
  currency: string;
  workDaysPerWeek: number;
  hoursPerDay: number;
}

export default function WorkerPortalPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useI18n();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'share' | 'config'>('dashboard');
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const [earningsConfig, setEarningsConfig] = useState<EarningsConfig>({
    hourlyRate: 25,
    currency: 'BRL',
    workDaysPerWeek: 5,
    hoursPerDay: 8,
  });

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '',
    checkOut: '',
    description: '',
  });

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dpoint_worker_config');
    if (saved) {
      setEarningsConfig(JSON.parse(saved));
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('dpoint_worker_config', JSON.stringify(earningsConfig));
  }, [earningsConfig]);

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dpoint_worker_entries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  // Save entries to localStorage
  useEffect(() => {
    localStorage.setItem('dpoint_worker_entries', JSON.stringify(entries));
  }, [entries]);

  const addEntry = () => {
    if (!newEntry.checkIn) return;

    const checkInTime = new Date(`${newEntry.date}T${newEntry.checkIn}`);
    const checkOutTime = newEntry.checkOut
      ? new Date(`${newEntry.date}T${newEntry.checkOut}`)
      : null;

    const hours = checkOutTime
      ? (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
      : 0;

    const entry: HourEntry = {
      id: Date.now().toString(),
      date: newEntry.date,
      checkIn: newEntry.checkIn,
      checkOut: newEntry.checkOut || null,
      hours: Math.round(hours * 100) / 100,
      description: newEntry.description,
    };

    setEntries([entry, ...entries]);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      checkIn: '',
      checkOut: '',
      description: '',
    });
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const totalHoursToday = entries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + e.hours, 0);

  const totalHoursWeek = entries
    .filter(e => {
      const d = new Date(e.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    })
    .reduce((sum, e) => sum + e.hours, 0);

  const totalHoursMonth = entries
    .filter(e => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.hours, 0);

  const totalEarnings = totalHoursMonth * earningsConfig.hourlyRate;

  // Projections
  const monthlyProjection = earningsConfig.hourlyRate * earningsConfig.hoursPerDay * earningsConfig.workDaysPerWeek * 4.33;
  const yearlyProjection = monthlyProjection * 12;

  const handleShare = () => {
    setShowShareModal(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShareEmail('');
  };

  const exportCSV = () => {
    const csv = [
      ['Data', 'Entrada', 'Saída', 'Horas', 'Descrição'],
      ...entries.map(e => [
        e.date,
        e.checkIn,
        e.checkOut || '-',
        `${e.hours}h`,
        e.description || '-'
      ])
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus_horarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Clock className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo iconSize="xs" />
            <span className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Portal Trabalhador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer border-0 bg-transparent flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Início
            </button>
            {user && (
              <button
                onClick={() => navigate('/checkin')}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-xl cursor-pointer border-0"
              >
                <Plus className="w-4 h-4" />
                Novo Registro
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700">
        <div className="absolute inset-0 opacity-10">
          <img src={img5} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-xs font-semibold mb-4 backdrop-blur-sm">
                <Shield className="w-3.5 h-3.5" />
                Seus dados, seu controle
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                Gerencie seus{' '}
                <span className="text-emerald-200">horários trabalhados</span>
              </h1>
              <p className="text-white/80 max-w-lg leading-relaxed">
                Registre seus pontos, acompanhe seus ganhos e compartilhe seus dados com quem você quiser.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                  <img src={img2} alt="Trabalhador" className="w-full h-48 object-cover" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Ganhos este mês</p>
                    <p className="text-sm font-bold text-emerald-600">R$ {totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Horas Hoje"
            value={totalHoursToday.toFixed(1)}
            icon={Clock}
            color="emerald"
            suffix="h"
          />
          <MetricCard
            label="Horas Semana"
            value={totalHoursWeek.toFixed(1)}
            icon={Calendar}
            color="indigo"
            suffix="h"
          />
          <MetricCard
            label="Horas Mês"
            value={totalHoursMonth.toFixed(1)}
            icon={BarChart3}
            color="amber"
            suffix="h"
          />
          <MetricCard
            label="Ganhos (mês)"
            value={`R$ ${totalEarnings.toFixed(0)}`}
            icon={DollarSign}
            color="emerald"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'history', label: 'Histórico', icon: Clock },
            { id: 'share', label: 'Compartilhar', icon: Share2 },
            { id: 'config', label: 'Configurações', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Earnings Projection */}
            <ChartCard
              title="Projeção de Ganhos"
              subtitle={`Baseado na sua configuração de R$ ${earningsConfig.hourlyRate}/hora`}
              icon={TrendingUp}
            >
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Mensal</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">R$ {monthlyProjection.toFixed(2)}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {earningsConfig.workDaysPerWeek} dias × {earningsConfig.hoursPerDay}h × R$ {earningsConfig.hourlyRate}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-700">Semanal</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">R$ {(monthlyProjection / 4.33).toFixed(2)}</p>
                  <p className="text-xs text-indigo-600 mt-1">
                    {earningsConfig.workDaysPerWeek} dias × {earningsConfig.hoursPerDay}h × R$ {earningsConfig.hourlyRate}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Anual</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">R$ {yearlyProjection.toFixed(2)}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {earningsConfig.workDaysPerWeek * 52} dias × {earningsConfig.hoursPerDay}h × R$ {earningsConfig.hourlyRate}
                  </p>
                </div>
              </div>
            </ChartCard>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <GridLineCard
                hover
                glow
                padding="lg"
                className="cursor-pointer group"
                onClick={() => navigate('/checkin')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <Plus className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Registrar Ponto</h3>
                    <p className="text-sm text-slate-500">Check-in via QR Code ou GPS</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-emerald-600 transition-colors" />
                </div>
              </GridLineCard>
              <GridLineCard
                hover
                glow
                padding="lg"
                className="cursor-pointer group"
                onClick={() => setActiveTab('share')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <Share2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Compartilhar Horas</h3>
                    <p className="text-sm text-slate-500">Envie seus dados para quem quiser</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 ml-auto group-hover:text-indigo-600 transition-colors" />
                </div>
              </GridLineCard>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <GridLineCard padding="none">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Meus Registros</h2>
                  <p className="text-xs text-slate-500">{entries.length} registros no total</p>
                </div>
              </div>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-50 transition-all cursor-pointer border-0 bg-transparent"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            {/* Quick Add Form */}
            <div className="p-5 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={newEntry.checkIn}
                  onChange={(e) => setNewEntry({ ...newEntry, checkIn: e.target.value })}
                  placeholder="Entrada"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={newEntry.checkOut}
                  onChange={(e) => setNewEntry({ ...newEntry, checkOut: e.target.value })}
                  placeholder="Saída"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  placeholder="Descrição (opcional)"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  onClick={addEntry}
                  disabled={!newEntry.checkIn}
                  className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-5 font-medium text-slate-600">Data</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Entrada</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Saída</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Horas</th>
                    <th className="text-left py-3 px-5 font-medium text-slate-600">Descrição</th>
                    <th className="text-center py-3 px-5 font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-medium text-slate-800">
                        {new Date(entry.date).toLocaleDateString(locale)}
                      </td>
                      <td className="py-3 px-5 text-center text-slate-600">{entry.checkIn}</td>
                      <td className="py-3 px-5 text-center text-slate-600">{entry.checkOut || '-'}</td>
                      <td className="py-3 px-5 text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          <Clock className="w-3 h-3" />
                          {entry.hours}h
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-600">{entry.description || '-'}</td>
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer border-0 bg-transparent"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length === 0 && (
              <div className="py-12 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Nenhum registro ainda. Adicione seu primeiro ponto!</p>
              </div>
            )}
          </GridLineCard>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div className="space-y-6">
            <ChartCard
              title="Compartilhar Horários"
              subtitle="Envie seus dados para empregadores, clientes ou contadores"
              icon={Share2}
            >
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold px-6 py-4 rounded-xl text-sm flex items-center gap-3 transition-all shadow-lg hover:shadow-xl cursor-pointer border-0"
                >
                  <Mail className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold">Enviar por Email</p>
                    <p className="text-xs text-indigo-200">Compartilhe com um destinatário específico</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/worker/shared?user=${user?.uid || 'demo'}`;
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-4 rounded-xl text-sm flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  <div className="text-left">
                    <p className="font-bold">{copied ? 'Link Copiado!' : 'Copiar Link'}</p>
                    <p className="text-xs text-slate-500">Gere um link para compartilhar</p>
                  </div>
                </button>
              </div>

              {/* Preview of shared data */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  Pré-visualização do compartilhamento
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Horas este mês</p>
                    <p className="text-lg font-bold text-slate-900">{totalHoursMonth.toFixed(1)}h</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Registros</p>
                    <p className="text-lg font-bold text-slate-900">{entries.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Ganhos estimados</p>
                    <p className="text-lg font-bold text-emerald-600">R$ {totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <ChartCard
            title="Configurações de Ganhos"
            subtitle="Defina sua hora trabalhada para projeções de ganhos"
            icon={Settings}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Valor por hora (R$)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={earningsConfig.hourlyRate}
                    onChange={(e) => setEarningsConfig({ ...earningsConfig, hourlyRate: Number(e.target.value) })}
                    className="w-full text-sm border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Dias por semana
                </label>
                <select
                  value={earningsConfig.workDaysPerWeek}
                  onChange={(e) => setEarningsConfig({ ...earningsConfig, workDaysPerWeek: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value={5}>5 dias (segunda a sexta)</option>
                  <option value={6}>6 dias (segunda a sábado)</option>
                  <option value={7}>7 dias</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Horas por dia
                </label>
                <input
                  type="number"
                  value={earningsConfig.hoursPerDay}
                  onChange={(e) => setEarningsConfig({ ...earningsConfig, hoursPerDay: Number(e.target.value) })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Moeda
                </label>
                <select
                  value={earningsConfig.currency}
                  onChange={(e) => setEarningsConfig({ ...earningsConfig, currency: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm text-emerald-700">
                <strong>Projeção:</strong> Com {earningsConfig.workDaysPerWeek} dias/semana × {earningsConfig.hoursPerDay}h/dia × R$ {earningsConfig.hourlyRate}/hora, você projeta ganhar{' '}
                <strong>R$ {monthlyProjection.toFixed(2)}/mês</strong> ({yearlyProjection.toFixed(2)}/ano).
              </p>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Compartilhar por Email</h3>
                <p className="text-xs text-slate-500">Envie seus horários trabalhados</p>
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
                onClick={handleShare}
                disabled={!shareEmail}
                className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-all cursor-pointer border-0 bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
