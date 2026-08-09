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

  const funcionariosAtivos = data.funcionarios.filter((f: any) => f.status === 'Ativo').length;
  const registrosHoje = data.registros.filter((r: any) => isToday(r.data_hora));
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

  const locationStats = data.locais.map((loc: any) => ({
    name: loc.nome_empresa.length > 15 ? loc.nome_empresa.substring(0, 15) + '...' : loc.nome_empresa,
    registros: data.registros.filter((r: any) => r.id_local === loc.id_local && isToday(r.data_hora)).length,
  })).filter((l: any) => l.registros > 0).sort((a: any, b: any) => b.registros - a.registros).slice(0, 5);

  const tipoData = [
    { name: 'Check-in', value: checkinsHoje },
    { name: 'Check-out', value: checkoutsHoje },
  ];

  const ultimosRegistros = data.registros.slice(0, 8);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer border-0 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
        }
      />

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
          value={data.locais.length}
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
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
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
                        <Cell key={index} fill={index === 0 ? '#10b981' : '#6366f1'} />
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
                  <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
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
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
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
            <div className="space-y-1">
              {ultimosRegistros.map((reg: any) => (
                <div
                  key={reg.id_registro}
                  className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      reg.tipo === 'Check-in' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {reg.tipo === 'Check-in' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{reg.nome_funcionario || `Func. #${reg.id_funcionario}`}</p>
                      <p className="text-xs text-slate-400">{reg.nome_local || `Local #${reg.id_local}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={reg.tipo === 'Check-in' ? 'success' : 'default'}>
                      {reg.tipo}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                      {new Date(reg.data_hora).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!reg.dentro_geofence && reg.dentro_geofence !== undefined && (
                      <p className="text-[10px] text-amber-500 font-medium">{t('dash.outsideGeofence')}</p>
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
