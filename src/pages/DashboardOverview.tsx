import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, ClipboardList, TrendingUp, Clock, AlertTriangle, CheckCircle2, RefreshCw, BarChart3, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '../components/ui';
import GridLineCard from '../components/ui/GridLineCard';
import MetricCard from '../components/ui/MetricCard';
import ChartCard from '../components/ui/ChartCard';
import PageHeader from '../components/layouts/PageHeader';
import { dataService } from '../utils/gasClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';

function isToday(dateStr: string): boolean {
  const recordDate = new Date(dateStr);
  const now = new Date();
  return recordDate.getFullYear() === now.getFullYear() &&
    recordDate.getMonth() === now.getMonth() &&
    recordDate.getDate() === now.getDate();
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  useEffect(() => {
    let loaded = false;

    const unsubRegistros = dataService.listenToRegistros((registros) => {
      setData((prev: any) => ({ ...prev, registros }));
      setLoadError(false);
      if (!loaded) { loaded = true; setLoading(false); setRefreshing(false); }
    }, empresaId);

    const unsubLocais = dataService.listenToLocais((locais) => {
      setData((prev: any) => ({ ...prev, locais }));
    }, empresaId);

    const unsubFuncionarios = dataService.listenToFuncionarios((funcionarios) => {
      setData((prev: any) => ({ ...prev, funcionarios }));
    }, empresaId);

    return () => {
      unsubRegistros();
      unsubLocais();
      unsubFuncionarios();
    };
  }, [empresaId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (loading || !data) {
    if (loadError) {
      return (
        <div className="p-6 lg:p-8">
          <PageHeader title={t('dash.title')} subtitle="" />
          <GridLineCard className="border-red-200 bg-red-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{t('dash.loadError')}</span>
              </div>
              <button onClick={handleRefresh} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer border-0 bg-transparent">
                {t('common.tryAgain')}
              </button>
            </div>
          </GridLineCard>
        </div>
      );
    }
    return (
      <div className="p-6 lg:p-8">
        <PageHeader title={t('dash.title')} subtitle={t('dash.loadingData')} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <GridLineCard key={i} className="animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-100 rounded w-16" />
            </GridLineCard>
          ))}
        </div>
      </div>
    );
  }

  const registros = data.registros || [];
  const locais = data.locais || [];
  const funcionarios = data.funcionarios || [];

  const funcionariosAtivos = funcionarios.filter((f: any) => f.status === 'Ativo').length;
  const registrosHoje = registros.filter((r: any) => isToday(r.data_hora));
  const trabalhadoresAtivosHoje = new Set(registrosHoje.map((r: any) => r.id_funcionario)).size;
  const checkinsHoje = registrosHoje.filter((r: any) => r.tipo === 'Check-in').length;
  const checkoutsHoje = registrosHoje.filter((r: any) => r.tipo === 'Check-out').length;
  const registrosForaGeofence = registrosHoje.filter((r: any) => r.dentro_geofence === false).length;

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const count = registrosHoje.filter((r: any) => {
      const h = new Date(r.data_hora).getHours();
      return h === hour;
    }).length;
    return { hora: `${String(hour).padStart(2, '0')}h`, registros: count };
  });

  const locationStats = locais.map((loc: any) => ({
    name: loc.nome_empresa.length > 15 ? loc.nome_empresa.substring(0, 15) + '...' : loc.nome_empresa,
    registros: registros.filter((r: any) => r.id_local === loc.id_local && isToday(r.data_hora)).length,
  })).filter((l: any) => l.registros > 0).sort((a: any, b: any) => b.registros - a.registros).slice(0, 5);

  const tipoData = [
    { name: 'Check-in', value: checkinsHoje },
    { name: 'Check-out', value: checkoutsHoje },
  ];

  // ─── Cálculo de jornada (horas trabalhadas hoje) ───────────────
  const horasTrabalhadasHoje = (() => {
    // Agrupa registros de hoje por funcionário
    const byEmployee = new Map<string, { checkins: Date[]; checkouts: Date[] }>();
    for (const r of registrosHoje) {
      const emp = r.id_funcionario;
      if (!byEmployee.has(emp)) byEmployee.set(emp, { checkins: [], checkouts: [] });
      const entry = byEmployee.get(emp)!;
      const dt = new Date(r.data_hora);
      if (r.tipo === 'Check-in') entry.checkins.push(dt);
      else entry.checkouts.push(dt);
    }

    let totalMinutes = 0;
    for (const [, { checkins, checkouts }] of byEmployee) {
      // Ordena cronologicamente
      checkins.sort((a, b) => a.getTime() - b.getTime());
      checkouts.sort((a, b) => a.getTime() - b.getTime());
      // Emparelha: cada check-in com o check-out seguinte
      const pairs = Math.min(checkins.length, checkouts.length);
      for (let i = 0; i < pairs; i++) {
        const diff = checkouts[i].getTime() - checkins[i].getTime();
        if (diff > 0) totalMinutes += diff / 60000;
      }
    }
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return { total: `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`, minutes: totalMinutes };
  })();

  // Funcionários que fizeram check-in mas NÃO check-out hoje
  const funcionariosEmCampo = (() => {
    const empCheckins = new Map<string, number>();
    const empCheckouts = new Map<string, number>();
    for (const r of registrosHoje) {
      if (r.tipo === 'Check-in') {
        empCheckins.set(r.id_funcionario, (empCheckins.get(r.id_funcionario) || 0) + 1);
      } else {
        empCheckouts.set(r.id_funcionario, (empCheckouts.get(r.id_funcionario) || 0) + 1);
      }
    }
    let count = 0;
    for (const [emp, ci] of empCheckins) {
      const co = empCheckouts.get(emp) || 0;
      if (ci > co) count++;
    }
    return count;
  })();

  const ultimosRegistros = registros.slice(0, 8);

  return (
    <div className="p-6 lg:p-8 font-sans">
    {/* Hero Section */}
    <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 lg:p-8 text-white mb-8 shadow-xl shadow-emerald-900/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight mb-2">Visão Geral da Operação</h1>
          <p className="text-emerald-50/80 max-w-lg text-sm leading-relaxed">
            Resumo diário da sua equipe. Hoje, <strong>{funcionariosEmCampo}</strong> trabalhadores estão ativos em campo através de <strong>{locationStats.length}</strong> locais diferentes.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-bold text-white transition-all cursor-pointer border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar Agora
        </button>
      </div>
    </div>

    {/* KPI Metrics Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        label={t('dash.activeEmployees')}
        value={funcionariosAtivos}
        icon={Users}
        color="indigo"
      />
      <MetricCard
        label={t('dash.registeredSites')}
        value={locais.length}
        icon={MapPin}
        color="emerald"
      />
      <MetricCard
        label={t('dash.recordsToday')}
        value={registrosHoje.length}
        icon={ClipboardList}
        color="sky"
      />
      <MetricCard
        label={t('dash.teamInField')}
        value={trabalhadoresAtivosHoje}
        icon={TrendingUp}
        color="amber"
      />
    </div>

    {/* Secondary Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <MetricCard
        label={t('dash.checkinsToday')}
        value={checkinsHoje}
        icon={CheckCircle2}
        color="emerald"
      />
      <MetricCard
        label={t('dash.checkoutsToday')}
        value={checkoutsHoje}
        icon={Clock}
        color="indigo"
      />
      <MetricCard
        label={lang === 'pt' ? 'Horas trabalhadas hoje' : 'Hours worked today'}
        value={horasTrabalhadasHoje.total}
        icon={Activity}
        color="sky"
      />
      {funcionariosEmCampo > 0 && (
        <MetricCard
          label={lang === 'pt' ? 'Em campo agora' : 'In field now'}
          value={funcionariosEmCampo}
          icon={TrendingUp}
          color="amber"
        />
      )}
      {registrosForaGeofence > 0 && (
        <MetricCard
          label={t('dash.outsideGeofence')}
          value={registrosForaGeofence}
          icon={AlertTriangle}
          color="rose"
        />
      )}
    </div>

    {/* Charts Grid */}
    {(hourlyData.some(h => h.registros > 0) || locationStats.length > 0) && (
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {hourlyData.some(h => h.registros > 0) && (
          <ChartCard
            title={t('dash.recordsByHour')}
            subtitle="Distribuição de registros ao longo do dia"
            icon={BarChart3}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis
                  dataKey="hora"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="registros"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {tipoData.some(tp => tp.value > 0) && (
          <ChartCard
            title={t('dash.inVsOut')}
            subtitle="Proporção check-in vs check-out"
            icon={Activity}
          >
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tipoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {tipoData.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? '#10b981' : '#0ea5e9'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-xs text-slate-500 font-medium">Check-in ({checkinsHoje})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-500 shadow-sm" />
                <span className="text-xs text-slate-500 font-medium">Check-out ({checkoutsHoje})</span>
              </div>
            </div>
          </ChartCard>
        )}
      </div>
    )}

    {/* Top Locations */}
    {locationStats.length > 0 && (
      <ChartCard
        title={t('dash.topSites')}
        subtitle="Locais com mais registros hoje"
        icon={MapPin}
        className="mb-6"
      >
        <ResponsiveContainer width="100%" height={Math.max(160, locationStats.length * 40)}>
          <BarChart data={locationStats} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#475569' }}
              width={130}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="registros"
              fill="url(#horizontalGradient)"
              radius={[0, 6, 6, 0]}
            />
            <defs>
              <linearGradient id="horizontalGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    )}

    {/* Recent Activity */}
    <GridLineCard padding="none">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{t('dash.recentActivity')}</h3>
              <p className="text-[11px] text-slate-400">Últimos registros de ponto</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/dashboard/registros')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer border-0 bg-transparent"
          >
            {t('dash.viewAll')}
          </button>
        </div>
      </div>
      <div className="p-5">
        {ultimosRegistros.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">{t('dash.noRecords')}</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-2.5 before:w-px before:bg-slate-200">
            {ultimosRegistros.map((reg: any) => (
              <div
                key={reg.id_registro}
                className="relative group"
              >
                <div className={`absolute -left-[30px] top-1 w-5 h-5 rounded-full border-4 border-white flex items-center justify-center z-10 ${reg.tipo === 'Check-in' ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}>
                  {reg.tipo === 'Check-in' ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <Clock className="w-2.5 h-2.5 text-white" />}
                </div>

                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow group-hover:border-emerald-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{reg.nome_funcionario || `Func. #${reg.id_funcionario}`}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-xs font-medium text-slate-500">{reg.nome_local || `Local #${reg.id_local}`}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={reg.tipo === 'Check-in' ? 'success' : 'default'} className="uppercase text-[9px] font-black tracking-wider">
                        {reg.tipo}
                      </Badge>
                      <p className="text-[11px] font-semibold text-slate-400 mt-1.5">
                        {new Date(reg.data_hora).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {!reg.dentro_geofence && reg.dentro_geofence !== undefined && (
                    <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 rounded-lg w-fit">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Fora do Raio</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GridLineCard>
  </div>
  );
}
