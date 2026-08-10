import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, CheckCircle2, Clock, ClipboardList, Calendar, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Card, Badge, SearchInput, Button, EmptyState } from '../components/ui';
import PageHeader from '../components/layouts/PageHeader';
import { dataService } from '../utils/gasClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { RegistroPonto } from '../types';

const PAGE_SIZE = 50;

/** Escapa valores para CSV (vírgulas, aspas e quebras de linha). */
function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getDateRange(preset: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today': {
      return { start: today, end: today };
    }
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: weekAgo.toISOString().split('T')[0], end: today };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart.toISOString().split('T')[0], end: today };
    }
    default:
      return { start: '', end: '' };
  }
}

export default function RegistrosPage() {
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Date range filter
  const [datePreset, setDatePreset] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    const unsub = dataService.listenToRegistros((registros) => {
      setRegistros(registros);
      setLoading(false);
    }, empresaId);

    return () => unsub();
  }, [empresaId]);

  // Apply date preset
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
    setCurrentPage(1);
  };

  const filtered = registros.filter(r => {
    // Search filter
    const matchSearch = search
      ? (r.nome_funcionario?.toLowerCase().includes(search.toLowerCase()) ||
         r.id_funcionario.includes(search) ||
         r.nome_local?.toLowerCase().includes(search.toLowerCase()))
      : true;

    // Type filter
    const matchTipo = filterTipo ? r.tipo === filterTipo : true;

    // Date range filter
    let matchDate = true;
    if (startDate) {
      const recordDate = r.data_hora.split('T')[0];
      if (recordDate < startDate) matchDate = false;
    }
    if (endDate) {
      const recordDate = r.data_hora.split('T')[0];
      if (recordDate > endDate) matchDate = false;
    }

    return matchSearch && matchTipo && matchDate;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRegistros = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder={t('reg.searchPlaceholder')} className="flex-1" />
        <select
          value={filterTipo}
          onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">{t('reg.allTypes')}</option>
          <option value="Check-in">Check-in</option>
          <option value="Check-out">Check-out</option>
        </select>
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
            startDate || endDate
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {startDate || endDate ? (
            <span>{startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate}</span>
          ) : (
            <span>{lang === 'pt' ? 'Período' : 'Period'}</span>
          )}
        </button>
      </div>

      {/* Date Filter Panel */}
      {showDateFilter && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-4 animate-slideUp">
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { id: 'today', label: lang === 'pt' ? 'Hoje' : 'Today' },
              { id: 'week', label: lang === 'pt' ? 'Última semana' : 'Last week' },
              { id: 'month', label: lang === 'pt' ? 'Este mês' : 'This month' },
              { id: 'all', label: lang === 'pt' ? 'Todos' : 'All' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleDatePreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">{lang === 'pt' ? 'De' : 'From'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">{lang === 'pt' ? 'Até' : 'To'}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setDatePreset(''); setCurrentPage(1); }}
                className="mt-5 text-xs text-red-600 font-semibold cursor-pointer border-0 bg-transparent hover:text-red-700"
              >
                {lang === 'pt' ? 'Limpar' : 'Clear'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Count */}
      {(search || filterTipo || startDate || endDate) && (
        <div className="mb-4 text-xs text-slate-500">
          {lang === 'pt'
            ? `Mostrando ${filtered.length} de ${registros.length} registros`
            : `Showing ${filtered.length} of ${registros.length} records`
          }
        </div>
      )}

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
        <>
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
                  {paginatedRegistros.map((reg) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-slate-400">
                {lang === 'pt'
                  ? `Página ${currentPage} de ${totalPages}`
                  : `Page ${currentPage} of ${totalPages}`
                }
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                {/* Page numbers — show max 5 */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
