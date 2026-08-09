import React, { useState, useEffect } from 'react';
import { Plus, QrCode, ExternalLink, MapPin, Pencil, Trash2, Loader2, Link, Copy, CheckCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, Badge, SearchInput, Button, EmptyState } from '../components/ui';
import PageHeader from '../components/layouts/PageHeader';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { dataService } from '../utils/gasClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { LocalServico } from '../types';

const EARTH_RADIUS = 6371e3;

const calculateRadiusFromBbox = (bbox: string[] | undefined): number => {
  if (!bbox || bbox.length < 4) return 100;
  try {
    const southLat = parseFloat(bbox[0]);
    const northLat = parseFloat(bbox[1]);
    const westLng = parseFloat(bbox[2]);
    const eastLng = parseFloat(bbox[3]);

    const φ1 = (southLat * Math.PI) / 180;
    const φ2 = (northLat * Math.PI) / 180;
    const Δφ = ((northLat - southLat) * Math.PI) / 180;
    const Δλ = ((eastLng - westLng) * Math.PI) / 180;

    const widthMeters = EARTH_RADIUS * Δλ * Math.cos((φ1 + φ2) / 2);
    const heightMeters = EARTH_RADIUS * Δφ;
    const diagonal = Math.sqrt(widthMeters * widthMeters + heightMeters * heightMeters);
    return Math.max(Math.min(Math.round(diagonal / 2), 500), 50);
  } catch {
    return 100;
  }
};

export default function ObrasPage() {
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t } = useI18n();
  const [locais, setLocais] = useState<LocalServico[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrLocal, setQrLocal] = useState<LocalServico | null>(null);
  const [editing, setEditing] = useState<LocalServico | null>(null);
  const [saving, setSaving] = useState(false);
  const [newLocal, setNewLocal] = useState({
    id: '', empresa: '', cidade: '', lat: '', lng: '', raio: '100', raioAuto: '100', address: '', raioAutoCalculated: false
  });
  const [copiedAutoLink, setCopiedAutoLink] = useState<string | null>(null);

  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  useEffect(() => {
    dataService.loadAllData(empresaId).then(d => {
      setLocais(d.locais);
      setLoading(false);
    });
  }, [empresaId]);

  const filtered = locais.filter(l =>
    l.nome_empresa.toLowerCase().includes(search.toLowerCase()) ||
    l.id_local.toLowerCase().includes(search.toLowerCase()) ||
    l.cidade.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setNewLocal({ id: '', empresa: '', cidade: '', lat: '', lng: '', raio: '100', raioAuto: '100', address: '', raioAutoCalculated: false });
  };

  const handleAddressSelect = (data: { lat: number; lng: number; address: string; city: string; boundingbox?: string[] }) => {
    const autoRadius = calculateRadiusFromBbox(data.boundingbox);
    setNewLocal(prev => ({
      ...prev,
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      address: data.address,
      cidade: data.city || prev.cidade,
      raio: autoRadius.toString(),
      raioAuto: autoRadius.toString(),
      raioAutoCalculated: true,
    }));
  };

  const validateCoords = (): { lat: number; lng: number } | null => {
    const lat = parseFloat(newLocal.lat);
    const lng = parseFloat(newLocal.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) { alert(t('obras.invalidLat')); return null; }
    if (isNaN(lng) || lng < -180 || lng > 180) { alert(t('obras.invalidLng')); return null; }
    return { lat, lng };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const coords = validateCoords();
    if (!coords) { setSaving(false); return; }

    try {
      const local: LocalServico = {
        id_local: newLocal.id.toUpperCase(),
        nome_empresa: newLocal.empresa,
        cidade: newLocal.cidade,
        latitude: coords.lat,
        longitude: coords.lng,
        raio_metros: parseInt(newLocal.raio) || 100,
        raio_auto_checkin: parseInt(newLocal.raioAuto) || 100,
        empresa_id: empresaAdmin?.empresa_id || '',
      };
      await dataService.cadastrarLocal(local);
      setLocais(prev => [...prev, local]);
      resetForm();
      setShowAdd(false);
      
      // Mostra modal com QR code e link de auto-cadastro
      setQrLocal(local);
     } catch (err) {
      console.error('Erro ao salvar obra:', err);
      alert(t('obras.saveError'));
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);

    const coords = validateCoords();
    if (!coords) { setSaving(false); return; }

    try {
      const updated: LocalServico = {
        ...editing,
        nome_empresa: newLocal.empresa,
        cidade: newLocal.cidade,
        latitude: coords.lat,
        longitude: coords.lng,
        raio_metros: parseInt(newLocal.raio) || 100,
        raio_auto_checkin: parseInt(newLocal.raioAuto) || 100,
      };
      await dataService.cadastrarLocal(updated);
      setLocais(prev => prev.map(l => l.id_local === editing.id_local ? updated : l));
      setEditing(null);
    } catch (err) {
      console.error('Erro ao editar obra:', err);
      alert(t('obras.saveError'));
    }
    setSaving(false);
  };

  const handleDelete = async (local: LocalServico) => {
    if (!confirm(t('obras.deleteConfirm', { name: local.nome_empresa }))) return;
    try {
      await dataService.excluirLocal(local.id_local);
      setLocais(prev => prev.filter(l => l.id_local !== local.id_local));
    } catch (err) {
      console.error('Erro ao excluir obra:', err);
      alert(t('obras.deleteError'));
    }
  };

  const startEdit = (local: LocalServico) => {
    setNewLocal({
      id: local.id_local,
      empresa: local.nome_empresa,
      cidade: local.cidade,
      lat: local.latitude.toString(),
      lng: local.longitude.toString(),
      raio: local.raio_metros.toString(),
      raioAuto: (local.raio_auto_checkin || local.raio_metros).toString(),
      address: '',
      raioAutoCalculated: false,
    });
    setEditing(local);
    setShowAdd(false);
  };

  const qrUrl = qrLocal
    ? `${window.location.origin}/checkin?local=${qrLocal.id_local}&lat=${qrLocal.latitude}&lng=${qrLocal.longitude}`
    : '';

  const autoCadastroUrl = qrLocal
    ? `${window.location.origin}/checkin?local=${qrLocal.id_local}&lat=${qrLocal.latitude}&lng=${qrLocal.longitude}&auto_cadastro=1`
    : '';

  const copyAutoLink = () => {
    navigator.clipboard.writeText(autoCadastroUrl);
    setCopiedAutoLink(qrLocal?.id_local || '');
    setTimeout(() => setCopiedAutoLink(null), 2000);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('obras.title')}
        subtitle={t('obras.subtitle', { count: locais.length })}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowAdd(true); }}>
            {t('obras.new')}
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder={t('obras.searchPlaceholder')} className="mb-6" />

      {showAdd || editing ? (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={editing ? handleEdit : handleAdd} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{editing ? t('obras.edit') : t('obras.new')}</h3>
              {editing && <span className="text-xs text-slate-400 font-mono">{editing.id_local}</span>}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {!editing && (
                <input
                  type="text"
                  placeholder={t('obras.idPlaceholder')}
                  value={newLocal.id}
                  onChange={(e) => setNewLocal({ ...newLocal, id: e.target.value })}
                  required
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              )}
              <input
                type="text"
                placeholder={t('obras.namePlaceholder')}
                value={newLocal.empresa}
                onChange={(e) => setNewLocal({ ...newLocal, empresa: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              <AddressAutocomplete
                value={newLocal.address}
                onChange={(address) => setNewLocal({ ...newLocal, address })}
                onSelect={handleAddressSelect}
                placeholder={t('obras.addressPlaceholder')}
                className="sm:col-span-2"
              />

              <input
                type="text"
                placeholder={t('obras.cityPlaceholder')}
                value={newLocal.cidade}
                onChange={(e) => setNewLocal({ ...newLocal, cidade: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder={t('obras.radiusPlaceholder')}
                value={newLocal.raio}
                onChange={(e) => setNewLocal({ ...newLocal, raio: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder={t('obras.radiusAutoPlaceholder')}
                value={newLocal.raioAuto}
                onChange={(e) => setNewLocal({ ...newLocal, raioAuto: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                step="any"
                placeholder={t('obras.latPlaceholder')}
                value={newLocal.lat}
                onChange={(e) => setNewLocal({ ...newLocal, lat: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="number"
                step="any"
                placeholder={t('obras.lngPlaceholder')}
                value={newLocal.lng}
                onChange={(e) => setNewLocal({ ...newLocal, lng: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              {newLocal.lat && newLocal.lng && (
                <div className="sm:col-span-2 flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-50 rounded-lg px-3 py-2">
                  <span>Lat: {parseFloat(newLocal.lat).toFixed(6)} | Lng: {parseFloat(newLocal.lng).toFixed(6)}</span>
                  {newLocal.raioAutoCalculated && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                      {t('obras.radiusAutoCalculated')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* QR Code Preview */}
            {newLocal.lat && newLocal.lng && newLocal.id && (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-slate-700">{t('obras.qrPreview')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-2 shrink-0">
                    <QRCodeCanvas value={`${window.location.origin}/checkin?local=${newLocal.id.toUpperCase()}&lat=${newLocal.lat}&lng=${newLocal.lng}`} size={100} level="M" includeMargin={false} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono break-all">{`${window.location.origin}/checkin?local=${newLocal.id.toUpperCase()}&lat=${newLocal.lat}&lng=${newLocal.lng}`}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" disabled={saving || !newLocal.lat || !newLocal.lng}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setEditing(null); resetForm(); }}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title={t('obras.notFound')}
          description={t('obras.notFoundDesc')}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((local) => (
            <Card key={local.id_local} hover>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{local.nome_empresa}</p>
                    <p className="text-xs text-slate-400">{local.cidade} · {local.id_local}</p>
                  </div>
                  <Badge variant="info">{local.raio_metros}m</Badge>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {local.latitude.toFixed(6)}, {local.longitude.toFixed(6)}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setQrLocal(local)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {t('obras.qrCode')}
                  </button>
                  <a
                    href={`/checkin?local=${local.id_local}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors no-underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('obras.test')}
                  </a>
                  <button
                    onClick={() => startEdit(local)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(local)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Modal com link de auto-cadastro */}
      {qrLocal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setQrLocal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <h3 className="text-base font-semibold text-slate-800">{qrLocal.nome_empresa}</h3>
              <div className="mx-auto w-fit p-3 rounded-xl border border-slate-100 bg-white">
                <QRCodeCanvas value={qrUrl} size={220} level="M" includeMargin={false} />
              </div>
              <p className="text-xs text-slate-500">{t('obras.scanToCheckin')}</p>
              <p className="text-[10px] text-slate-400 font-mono break-all">{qrUrl}</p>

              {/* Link de auto-cadastro */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Link className="w-4 h-4" />
                  <span>{t('obras.autoCadastroTitle')}</span>
                </div>
                <p className="text-xs text-indigo-600">{t('obras.autoCadastroDesc')}</p>
                <div className="text-[10px] font-mono text-indigo-700 bg-white rounded-lg p-2 break-all">
                  {autoCadastroUrl}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(autoCadastroUrl);
                      setCopiedAutoLink(qrLocal.id_local);
                      setTimeout(() => setCopiedAutoLink(null), 2000);
                    }}
                  >
                    {copiedAutoLink === qrLocal.id_local ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {t('common.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        {t('obras.copyAutoLink')}
                      </>
                    )}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    alert(t('obras.linkCopied'));
                  }}>
                    {t('common.copyLink')}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setQrLocal(null)}>{t('common.close')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}