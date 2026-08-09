import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Pencil, Trash2, Globe, Save, Loader2, X } from 'lucide-react';
import { Card, Badge, Button, EmptyState, SearchInput } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useWorkerData } from '../../hooks/useWorkerData';
import { useI18n } from '../../i18n';
import { ObraPessoal } from '../../types';
import { dataService } from '../../utils/gasClient';
import { generateId } from '../../utils/crypto';

interface FormState {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  lat: string;
  lng: string;
  raio: string;
  cliente: string;
  valor_hora: string;
  ativa: boolean;
}

export default function WorkerObrasPage() {
  const { t } = useI18n();
  const { trabalhador } = useWorkerAuth();
  const { obras, loading, refresh } = useWorkerData(trabalhador?.id || null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ObraPessoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    id: '',
    nome: '',
    endereco: '',
    cidade: '',
    lat: '',
    lng: '',
    raio: '100',
    cliente: '',
    valor_hora: '',
    ativa: true,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        id: editing.id,
        nome: editing.nome,
        endereco: editing.endereco,
        cidade: editing.cidade,
        lat: editing.latitude.toString(),
        lng: editing.longitude.toString(),
        raio: editing.raio_metros.toString(),
        cliente: editing.cliente || '',
        valor_hora: editing.valor_hora ? editing.valor_hora.toString() : '',
        ativa: editing.ativa,
      });
    }
  }, [editing]);

  const handleAddressSelect = (data: { lat: number; lng: number; address: string; city: string }) => {
    setForm(prev => ({
      ...prev,
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      endereco: data.address,
      cidade: prev.cidade || data.city,
    }));
  };

  const validate = (): { lat: number; lng: number } | null => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) { alert(t('obras.invalidLat')); return null; }
    if (isNaN(lng) || lng < -180 || lng > 180) { alert(t('obras.invalidLng')); return null; }
    return { lat, lng };
  };

  const resetForm = () => {
    setForm({
      id: '',
      nome: '',
      endereco: '',
      cidade: '',
      lat: '',
      lng: '',
      raio: '100',
      cliente: '',
      valor_hora: '',
      ativa: true,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabalhador) return;

    const coords = validate();
    if (!coords) return;

    setSaving(true);
    try {
      const obra: ObraPessoal = {
        id: form.id || generateId('obra'),
        trabalhador_id: trabalhador.id,
        nome: form.nome,
        endereco: form.endereco,
        latitude: coords.lat,
        longitude: coords.lng,
        raio_metros: parseInt(form.raio) || 100,
        cliente: form.cliente || undefined,
        valor_hora: form.valor_hora ? parseFloat(form.valor_hora) : undefined,
        ativa: form.ativa,
        created_at: editing ? editing.created_at : new Date().toISOString(),
      };
      await dataService.saveObraPessoal(obra);
      await refresh();
    } catch (err) {
      console.error('Erro ao salvar obra:', err);
    }
    setSaving(false);
    setShowAdd(false);
    setEditing(null);
    resetForm();
  };

  const handleDelete = async (obra: ObraPessoal) => {
    if (!confirm(t('worker.obras.deleteConfirm', { name: obra.nome }))) return;
    try {
      await dataService.deleteObraPessoal(obra.id);
      await refresh();
    } catch (err) {
      console.error('Erro ao excluir obra:', err);
      alert(t('worker.obras.deleteError'));
    }
  };

  const startEdit = (obra: ObraPessoal) => {
    setEditing(obra);
    setShowAdd(true);
  };

  const filtered = obras.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    o.cidade.toLowerCase().includes(search.toLowerCase())
  );

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
        title={t('worker.obras.title')}
        subtitle={t('worker.obras.subtitle', { count: obras.length })}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setEditing(null); setShowAdd(true); }}>
            {t('worker.obras.new')}
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder={t('worker.obras.search')} className="mb-6" />

      {showAdd && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {editing ? t('worker.obras.edit') : t('worker.obras.new')}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setEditing(null); resetForm(); }}
                className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('worker.obras.namePlaceholder')}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <AddressAutocomplete
                value={form.endereco}
                onChange={(endereco) => setForm({ ...form, endereco })}
                onSelect={handleAddressSelect}
                placeholder={t('worker.obras.addressPlaceholder')}
                className="sm:col-span-2"
              />
              <input
                type="text"
                placeholder={t('worker.obras.addressPlaceholder')}
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder={t('worker.obras.radiusPlaceholder')}
                value={form.raio}
                onChange={(e) => setForm({ ...form, raio: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder={t('worker.obras.clientePlaceholder')}
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder={t('worker.obras.valorHoraPlaceholder')}
                value={form.valor_hora}
                onChange={(e) => setForm({ ...form, valor_hora: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativa}
                  onChange={(e) => setForm({ ...form, ativa: e.target.checked })}
                  className="rounded"
                />
                {t('worker.obras.ativa')}
              </label>
            </div>

            {form.lat && form.lng && (
              <div className="text-xs text-slate-500 font-mono bg-slate-50 rounded-lg p-2">
                Lat: {parseFloat(form.lat).toFixed(6)} | Lng: {parseFloat(form.lng).toFixed(6)}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving || !form.lat || !form.lng}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('worker.obras.save')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setEditing(null); resetForm(); }}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title={t('worker.obras.notFound')}
          description={t('worker.obras.notFoundDesc')}
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAdd(true); }}>
              {t('worker.obras.new')}
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((obra) => (
            <Card key={obra.id} hover>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{obra.nome}</p>
                    <p className="text-xs text-slate-400">{obra.cidade} · {obra.endereco}</p>
                  </div>
                  <Badge variant={obra.ativa ? 'success' : 'default'}>
                    {obra.ativa ? t('worker.obras.ativa') : t('worker.obras.inativa')}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {obra.latitude.toFixed(6)}, {obra.longitude.toFixed(6)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{obra.raio_metros}m</span>
                    {obra.valor_hora && <span className="text-slate-400">· R$ {obra.valor_hora}/h</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(obra)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
                    >
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(obra)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
