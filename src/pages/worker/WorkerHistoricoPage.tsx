import React, { useState } from 'react';
import { Download, Clock, CheckCircle2, Calendar, Filter, ChevronDown } from 'lucide-react';
import { Card, Badge, Button, EmptyState, SearchInput } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useWorkerData } from '../../hooks/useWorkerData';
import { useI18n } from '../../i18n';
import { SessaoTrabalho } from '../../types';

export default function WorkerHistoricoPage() {
  const { t, lang } = useI18n();
  const { trabalhador } = useWorkerAuth();
  const { sessoes, obras, getResumoDiario, loading, refresh } = useWorkerData(trabalhador?.id || null);
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState<string | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  const getFilteredSessoes = () => {
    let filtered = sessoes;

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(s => new Date(s.data_hora) >= cutoff);
    }

    if (filterObra !== 'all') {
      filtered = filtered.filter(s => s.obra_id === filterObra);
    }

    filtered = filtered.filter(s =>
      s.observacao?.toLowerCase().includes(search.toLowerCase()) ||
      s.tipo.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  };

  const filtered = getFilteredSessoes();

  const exportCSV = () => {
    const headers = ['Tipo', 'Obra', 'Data/Hora', 'Duração', 'Ganho', 'Geofence', 'Observação'];
    const rows = filtered.map(s => {
      const obra = obras.find(o => o.id === s.obra_id);
      const resumo = getResumoDiario(s.data_hora.split('T')[0]);
      return [
        s.tipo === 'inicio' ? 'Entrada' : 'Saída',
        obra?.nome || 'Obra desconhecida',
        new Date(s.data_hora).toLocaleString(locale),
        '-',
        `R$ ${resumo.ganho_estimado.toFixed(2)}`,
        s.dentro_geofence ? 'Dentro' : 'Fora',
        s.observacao || '',
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-32 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-48" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('worker.historico.title')}
        subtitle={t('worker.historico.subtitle', { count: sessoes.length })}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCSV} disabled={filtered.length === 0}>
              {t('worker.historico.exportCsv')}
            </Button>
            <Button icon={<Calendar className="w-4 h-4" />} onClick={refresh}>
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t('worker.historico.search')} className="flex-1" />
        <div className="flex gap-2">
          <select
            value={filterObra}
            onChange={(e) => setFilterObra(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">Todas as obras</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">Todo período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title={t('worker.historico.notFound')}
          description={t('worker.historico.notFoundDesc')}
        />
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{t('worker.historico.colTipo')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3 hidden sm:table-cell">{t('worker.historico.colObra')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{t('worker.historico.colDataHora')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3 hidden md:table-cell">{t('worker.historico.colGeofence')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3 hidden lg:table-cell">{t('worker.historico.colObservacao')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: SessaoTrabalho) => {
                  const obra = obras.find(o => o.id === s.obra_id);
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <Badge variant={s.tipo === 'inicio' ? 'success' : 'default'}>
                          {s.tipo === 'inicio' ? t('worker.historico.entrada') : t('worker.historico.saida')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <p className="text-slate-500">{obra?.nome || 'Obra desconhecida'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-slate-500 font-mono text-xs">
                          {new Date(s.data_hora).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <Badge variant={s.dentro_geofence ? 'success' : 'warning'}>
                          {s.dentro_geofence ? t('worker.historico.dentro') : t('worker.historico.fora')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <p className="text-slate-400 text-xs truncate max-w-[200px]">{s.observacao || '—'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
