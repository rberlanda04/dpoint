import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Clock, ClipboardList } from 'lucide-react';
import { Card, Badge, SearchInput, Button, EmptyState } from '../components/ui';
import PageHeader from '../components/layouts/PageHeader';
import { dataService } from '../utils/gasClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { RegistroPonto } from '../types';

/** Escapa valores para CSV (vírgulas, aspas e quebras de linha). */
function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function RegistrosPage() {
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const unsub = dataService.listenToRegistros((registros) => {
      setRegistros(registros);
      setLoading(false);
      console.log('[RegistrosPage] Registros atualizados:', registros.length, 'empresaId:', empresaId);
    }, empresaId);

    return () => unsub();
  }, [empresaId]);

  const filtered = registros.filter(r => {
    const matchSearch = search
      ? (r.nome_funcionario?.toLowerCase().includes(search.toLowerCase()) ||
         r.id_funcionario.includes(search) ||
         r.nome_local?.toLowerCase().includes(search.toLowerCase()))
      : true;
    const matchTipo = filterTipo ? r.tipo === filterTipo : true;
    return matchSearch && matchTipo;
  });

  const exportCSV = () => {
    const headers = [
      t('reg.csvEmployee'), t('reg.csvSite'), t('reg.csvType'), t('reg.csvDateTime'),
      t('reg.csvLat'), t('reg.csvLng'), t('reg.csvAccuracy'), t('reg.csvGeofence'), t('reg.csvObs'),
    ];
    const rows = filtered.map(r => [
      r.nome_funcionario || r.id_funcionario,
      r.nome_local || r.id_local,
      r.tipo,
      new Date(r.data_hora).toLocaleString(locale),
      Number(r.latitude_registro || 0).toFixed(5),
      Number(r.longitude_registro || 0).toFixed(5),
      `${r.precisao_gps ?? 0}m`,
      r.dentro_geofence === false ? t('checkin.outside') : t('checkin.inside'),
      r.observacao,
    ]);
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registros_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('reg.title')}
        subtitle={t('reg.subtitle', { count: registros.length })}
        action={
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
            {t('reg.exportCsv')}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder={t('reg.searchPlaceholder')} className="flex-1" />
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">{t('reg.allTypes')}</option>
          <option value="Check-in">Check-in</option>
          <option value="Check-out">Check-out</option>
        </select>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {t('reg.loadError')}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-8 h-8" />}
          title={t('reg.notFound')}
          description={t('reg.notFoundDesc')}
        />
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{t('reg.colType')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{t('reg.colEmployee')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3 hidden sm:table-cell">{t('reg.colSite')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{t('reg.colDateTime')}</th>
                  <th className="text-xs font-semibold text-slate-400 uppercase tracking-wider py-3 px-3 hidden md:table-cell">{t('reg.colObservation')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg) => (
                  <tr key={reg.id_registro} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <Badge variant={reg.tipo === 'Check-in' ? 'success' : 'default'}>{reg.tipo}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-700">{reg.nome_funcionario || `Func. #${reg.id_funcionario}`}</p>
                    </td>
                    <td className="py-3 px-3 hidden sm:table-cell">
                      <p className="text-slate-500">{reg.nome_local || `Local #${reg.id_local}`}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-500 font-mono text-xs">
                        {new Date(reg.data_hora).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <p className="text-slate-400 text-xs truncate max-w-[200px]">{reg.observacao || '—'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
