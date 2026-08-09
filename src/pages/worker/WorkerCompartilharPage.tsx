import React, { useState, useEffect } from 'react';
import { Plus, Share2, Copy, CheckCircle, Calendar, BarChart3, TrendingUp, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, Button, Badge, EmptyState, SearchInput } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useWorkerData } from '../../hooks/useWorkerData';
import { useI18n } from '../../i18n';
import { Compartilhamento } from '../../types';
import { dataService } from '../../utils/gasClient';
import { generateId } from '../../utils/crypto';

const TIPOS_COMPARTILHAMENTO = [
  { value: 'resumo_semanal', label: 'Semanal', icon: Calendar, period: 'week' },
  { value: 'resumo_mensal', label: 'Mensal', icon: BarChart3, period: 'month' },
  { value: 'conquista', label: 'Conquista', icon: TrendingUp, period: 'all' },
] as const;

export default function WorkerCompartilharPage() {
  const { t } = useI18n();
  const { trabalhador } = useWorkerAuth();
  const { sessoes, obras, getStats, getResumoDiario, refresh } = useWorkerData(trabalhador?.id || null);
  const [compartilhamentos, setCompartilhamentos] = useState<Compartilhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (trabalhador) {
      dataService.loadCompartilhamentos(trabalhador.id).then(setCompartilhamentos).finally(() => setLoading(false));
    }
  }, [trabalhador]);

  const handleGenerate = async (tipo: string) => {
    if (!trabalhador) return;
    setGenerating(tipo);
    setError('');

    try {
      const stats = getStats();
      let conteudo: Record<string, any> = {};

      if (tipo === 'resumo_semanal') {
        conteudo = {
          periodo: 'Semana',
          horas: Math.round(stats.horasSemana * 100) / 100,
          ganho: stats.ganhoSemana,
          diasTrabalhados: stats.diasTrabalhados,
        };
      } else if (tipo === 'resumo_mensal') {
        conteudo = {
          periodo: 'Mês',
          horas: Math.round(stats.horasMes * 100) / 100,
          ganho: stats.ganhoMes,
          diasTrabalhados: stats.diasTrabalhados,
        };
      } else {
        conteudo = {
          periodo: 'Conquista',
          streak: stats.streak,
          totalHoras: Math.round(stats.horasMes * 100) / 100,
          totalGanho: stats.ganhoMes,
        };
      }

      const compartilhamento: Compartilhamento = {
        id: generateId('comp'),
        trabalhador_id: trabalhador.id,
        tipo: tipo as any,
        conteudo,
        created_at: new Date().toISOString(),
      };

      await dataService.saveCompartilhamento(compartilhamento);
      setCompartilhamentos(prev => [compartilhamento, ...prev]);
      await refresh();
    } catch (err) {
      console.error('Erro ao gerar compartilhamento:', err);
      setError(t('worker.compartilhar.erroGerar'));
    }
    setGenerating(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteCompartilhamento(id);
      setCompartilhamentos(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erro ao excluir compartilhamento:', err);
    }
  };

  const copyLink = (compartilhamento: Compartilhamento) => {
    const link = `${window.location.origin}/worker/compartilhar/${compartilhamento.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(compartilhamento.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = compartilhamentos.filter(c =>
    c.tipo?.toLowerCase().includes(search.toLowerCase()) ||
    c.conteudo?.periodo?.toLowerCase().includes(search.toLowerCase())
  );

  if (!trabalhador) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={<Share2 className="w-8 h-8" />}
          title={t('worker.compartilhar.nadaParaCompartilhar')}
          description={t('worker.compartilhar.nadaParaCompartilharDesc')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('worker.compartilhar.title')}
        subtitle={t('worker.compartilhar.subtitle')}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => {}} disabled={generating !== null}>
            {t('worker.compartilhar.gerar')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{t('worker.compartilhar.tipo')}</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {TIPOS_COMPARTILHAMENTO.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleGenerate(value)}
              disabled={generating !== null}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating === value ? (
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      <SearchInput value={search} onChange={setSearch} placeholder={t('worker.historico.search')} className="mb-6" />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Share2 className="w-8 h-8" />}
          title={t('worker.compartilhar.nadaParaCompartilhar')}
          description={t('worker.compartilhar.nadaParaCompartilharDesc')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} padding="sm" hover>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {c.tipo === 'resumo_semanal' ? t('worker.compartilhar.semana') :
                       c.tipo === 'resumo_mensal' ? t('worker.compartilhar.mes') :
                       t('worker.compartilhar.conquista')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(c)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
                    title={t('worker.compartilhar.copiarLink')}
                  >
                    {copiedId === c.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer border-0 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
