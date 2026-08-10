import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, ClipboardList, TrendingUp, Clock, AlertTriangle, CheckCircle2, RefreshCw, BarChart3, Activity, Calendar } from 'lucide-react';
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
        <div className="p-4 lg:p-8">
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
      <div className="p-4 lg:p-8">
        <PageHeader title={t('dash.title')} subtitle={t('dash.loadingData')} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
    name: loc.nome_empresa.length > 12 ? loc.nome_empresa.substring(0, 12) + '...' : loc.nome_empresa,
    registros: registros.filter((r: any) => r.id_local === loc.id_local && isToday(r.data_hora)).length,
  })).filter((l: any) => l.registros > 0).sort((a: any, b: any) => b.registros - a.registros).slice(0, 5);

  const tipoData = [
    { name: 'Check-in', value: checkinsHoje },
    { name: 'Check-out', value: checkoutsHoje },
  ];

  // Weekly data for the last 7 days
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const count = registros.filter((r: any) => r.data_hora && r.data_hora.startsWith(dayStr)).length;
    const label = d.toLocaleDateString(locale, { weekday: 'short' });
    return { dia: label.substring(0, 3), registros: count };
  });

  const horasTrabalhadasHoje = (() => {
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
      checkins.sort((a, b) => a.getTime() - b.getTime());
      checkouts.sort((a, b) => a.getTime() - b.getTime());
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

  const ultimosRegistros = registros.slice(0, 6);

  const todayLabel = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="p-4 lg:p-8 font-sans">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl lg:rounded-3xl p-4 lg:p-8 text-white mb-5 lg:mb-8 shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 lg:w-96 h-64 lg:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-200" />
                <p className="text-emerald-200 text-xs font-medium capitalize">{todayLabel}</p>
              </div>
              <h1 className="text-xl lg:text-3xl font-black tracking-tight mb-1 lg:mb-2">{t('dash.title')}</h1>
              <p className="text-emerald-50/80 text-xs lg:text-sm leading-relaxed hidden sm:block">
                {t('dash.subtitle')}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold text-white transition-all cursor-pointer border border-white/10 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{lang === 'pt' ? 'Atualizar' : 'Refresh'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span className="font-bold">{funcionariosEmCampo}</span>
              <span className="text-emerald-200">{lang === 'pt' ? 'em campo' : 'in field'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-bold">{locationStats.length}</span>
              <span className="text-emerald-200">{lang === 'pt' ? 'locais ativos' : 'active sites'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics - Primary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-8">
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
          label={lang === 'pt' ? 'Horas hoje' : 'Hours today'}
          value={horasTrabalhadasHoje.total}
          icon={Activity}
          color="sky"
        />
        {registrosForaGeofence > 0 && (
          <MetricCard
            label={t('dash.outsideGeofence')}
            value={registrosForaGeofence}
            icon={AlertTriangle}
            color="rose"
          />
        )}
      </div>

      {/* Charts - Weekly Trend */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5 lg:mb-8">
        <ChartCard
          title={lang === 'pt' ? 'Registros da Semana' : 'Weekly Records'}
          subtitle={lang === 'pt' ? 'Últimos 7 dias' : 'Last 7 days'}
          icon={BarChart3}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
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
                fill="url(#weeklyGradient)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t('dash.inVsOut')}
          subtitle={lang === 'pt' ? 'Proporção do dia' : "Today's ratio"}
          icon={Activity}
        >
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={tipoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
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
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 font-medium">Check-in ({checkinsHoje})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-[11px] text-slate-500 font-medium">Check-out ({checkoutsHoje})</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Today's Hourly Distribution */}
      {hourlyData.some(h => h.registros > 0) && (
        <ChartCard
          title={t('dash.recordsByHour')}
          subtitle={lang === 'pt' ? 'Distribuição ao longo do dia' : 'Distribution throughout the day'}
          icon={BarChart3}
          className="mb-5 lg:mb-8"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval={1}
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
                radius={[4, 4, 0, 0]}
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

      {/* Top Locations */}
      {locationStats.length > 0 && (
        <ChartCard
          title={t('dash.topSites')}
          subtitle={lang === 'pt' ? 'Mais registros hoje' : 'Most records today'}
          icon={MapPin}
          className="mb-5 lg:mb-8"
        >
          <ResponsiveContainer width="100%" height={Math.max(140, locationStats.length * 36)}>
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
                width={100}
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

      {/* No Data State */}
      {registros.length === 0 && (
        <GridLineCard className="mb-5 lg:mb-8 border-dashed border-slate-300">
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">
              {lang === 'pt' ? 'Nenhum registro ainda' : 'No records yet'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'pt' ? 'Os gráficos aparecerão quando houver dados de registros.' : 'Charts will appear once there are time records.'}
            </p>
          </div>
        </GridLineCard>
      )}

      {/* Recent Activity */}
      <GridLineCard padding="none">
        <div className="p-4 lg:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t('dash.recentActivity')}</h3>
                <p className="text-[11px] text-slate-400">{lang === 'pt' ? 'Últimos registros' : 'Latest records'}</p>
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
        <div className="p-4 lg:p-5">
          {ultimosRegistros.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{t('dash.noRecords')}</p>
          ) : (
            <div className="relative pl-5 space-y-4 before:absolute before:inset-y-2 before:left-2 before:w-px before:bg-slate-200">
              {ultimosRegistros.map((reg: any) => (
                <div key={reg.id_registro} className="relative group">
                  <div className={`absolute -left-[26px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white flex items-center justify-center z-10 ${reg.tipo === 'Check-in' ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                    {reg.tipo === 'Check-in' ? <CheckCircle2 className="w-2 h-2 text-white" /> : <Clock className="w-2 h-2 text-white" />}
                  </div>

                  <div className="bg-white border border-slate-100 p-3 lg:p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group-hover:border-emerald-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{reg.nome_funcionario || `Func. #${reg.id_funcionario}`}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <p className="text-xs font-medium text-slate-500 truncate">{reg.nome_local || `Local #${reg.id_local}`}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={reg.tipo === 'Check-in' ? 'success' : 'default'} className="uppercase text-[9px] font-black tracking-wider">
                          {reg.tipo}
                        </Badge>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">
                          {new Date(reg.data_hora).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {!reg.dentro_geofence && reg.dentro_geofence !== undefined && (
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded-lg w-fit">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">{lang === 'pt' ? 'Fora do Raio' : 'Outside Radius'}</span>
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
