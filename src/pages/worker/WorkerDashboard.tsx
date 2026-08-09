import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  BarChart3,
  ChevronRight,
  Loader2,
  Shield,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useWorkerData } from '../../hooks/useWorkerData';
import { useI18n } from '../../i18n';
import WorkerStatsCard from '../../components/worker/WorkerStatsCard';
import { WorkerChartArea, WorkerChartBar, WorkerChartPie } from '../../components/worker/WorkerCharts';

const GOAL_HORAS = 80;

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { trabalhador, logout } = useWorkerAuth();
  const { obras, sessoes, getStats, getHorasUltimos30Dias, getGanhosPorSemana, getDistribuicaoPorObra, getResumoDiario, loading, error, refresh } = useWorkerData(trabalhador?.id || null);

  const hoje = new Date().toISOString().split('T')[0];
  const resumoHoje = getResumoDiario(hoje);
  const stats = getStats();
  const horasChart = getHorasUltimos30Dias();
  const ganhosChart = getGanhosPorSemana();
  const distribuicao = getDistribuicaoPorObra();

  const goalProgress = Math.min((resumoHoje.horas_trabalhadas / GOAL_HORAS) * 100, 100);

  const pieData = distribuicao.map(d => ({
    name: d.nome,
    value: d.horas,
  }));

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-6 bg-slate-100 rounded w-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!trabalhador) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title={t('worker.dash.sessaoVazia')}
          description={t('worker.dash.sessaoVazioDesc')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('worker.dash.hoje')}
        subtitle={t('worker.dash.streak', { streak: stats.streak })}
        action={
          <Badge variant="info" className="text-xs">
            R$ {resumoHoje.ganho_estimado.toFixed(2)} {t('worker.dash.ganho')}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WorkerStatsCard
          label={t('worker.dash.hoje')}
          value={`${resumoHoje.horas_trabalhadas.toFixed(1)}h`}
          icon={Clock}
          color="text-indigo-600 bg-indigo-50"
        />
        <WorkerStatsCard
          label={t('worker.dash.semana')}
          value={`${stats.horasSemana.toFixed(1)}h`}
          icon={Calendar}
          color="text-emerald-600 bg-emerald-50"
          trend={{
            value: stats.horasSemana - stats.horasMes * 0.25,
            label: t('worker.dash.semanaComparacao'),
          }}
        />
        <WorkerStatsCard
          label={t('worker.dash.mes')}
          value={`${stats.horasMes.toFixed(1)}h`}
          icon={BarChart3}
          color="text-amber-600 bg-amber-50"
          trend={{ value: stats.ganhoMes, label: 'R$' }}
        />
        <WorkerStatsCard
          label={t('worker.dash.ganho')}
          value={`R$ ${stats.ganhoMes.toFixed(2)}`}
          icon={DollarSign}
          color="text-rose-600 bg-rose-50"
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">{t('worker.dash.progressoMeta', { horas: GOAL_HORAS })}</h3>
          <span className="text-xs text-slate-400">{resumoHoje.horas_trabalhadas.toFixed(1)}h / {GOAL_HORAS}h</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{t('worker.dash.semana')} (30 dias)</h3>
          <WorkerChartArea data={horasChart} height={200} showGanho />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{t('worker.dash.ganho')} por semana</h3>
          <WorkerChartBar
            data={ganhosChart.map(g => ({ name: g.semana, value: g.ganho }))}
            height={200}
            color="#f59e0b"
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Horas por obra</h3>
          <WorkerChartPie data={pieData} height={200} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4">{t('worker.dash.atividade')}</h3>
          {sessoes.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title={t('worker.dash.sessaoVazia')}
              description={t('worker.dash.sessaoVazioDesc')}
            />
          ) : (
            <div className="space-y-3">
              {sessoes.slice(0, 5).map((s) => {
                const obra = obras.find(o => o.id === s.obra_id);
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.tipo === 'inicio' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {s.tipo === 'inicio' ? t('worker.historico.entrada') : t('worker.historico.saida')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {obra?.nome || 'Obra desconhecida'} · {new Date(s.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
