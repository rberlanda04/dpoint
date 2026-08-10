import React, { useState, useEffect } from 'react';
import { Plus, QrCode, ExternalLink, MapPin, Pencil, Trash2, Loader2, Link, Copy, CheckCircle, Navigation } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, Badge, SearchInput, Button, EmptyState, Dialog } from '../components/ui';
import { useToast } from '../components/ui/Toast';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrLocal, setQrLocal] = useState<LocalServico | null>(null);
  const [editing, setEditing] = useState<LocalServico | null>(null);
  const [saving, setSaving] = useState(false);
  const generateId = () => `LOC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const [newLocal, setNewLocal] = useState({
    id: generateId(), empresa: '', cidade: '', lat: '', lng: '', raio: '100', raioAuto: '100', address: '', numero: '', raioAutoCalculated: false
  });
  const [copiedAutoLink, setCopiedAutoLink] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LocalServico | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const toast = useToast();

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
    setNewLocal({ id: generateId(), empresa: '', cidade: '', lat: '', lng: '', raio: '100', raioAuto: '100', address: '', numero: '', raioAutoCalculated: false });
  };

  const handleAddressSelect = (data: { lat: number; lng: number; address: string; city: string; boundingbox?: string[] }) => {
    const autoRadius = calculateRadiusFromBbox(data.boundingbox);
    const shortName = data.address.split(',')[0].trim();
    setNewLocal(prev => ({
      ...prev,
      lat: data.lat.toString(),
      lng: data.lng.toString(),
      address: data.address,
      cidade: data.city || prev.cidade,
      empresa: prev.empresa || shortName,
      raio: autoRadius.toString(),
      raioAuto: autoRadius.toString(),
      raioAutoCalculated: true,
    }));
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocalização não suportada pelo navegador.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLocal(prev => ({
          ...prev,
          lat: pos.coords.latitude.toString(),
          lng: pos.coords.longitude.toString(),
          raioAutoCalculated: false,
        }));
        toast.success('Localização capturada com sucesso!');
        setCapturingGps(false);
      },
      (err) => {
        console.error('Erro ao capturar GPS:', err);
        toast.error('Não foi possível obter a localização. Verifique as permissões.');
        setCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const [searchingNumber, setSearchingNumber] = useState(false);
  const handleNumberSearch = async (num: string) => {
    if (!num.trim() || !newLocal.address) return;
    setSearchingNumber(true);
    try {
      // Pega só o nome da rua (primeira parte antes da vírgula)
      const street = newLocal.address.split(',')[0].trim();
      const query = `${street}, ${num}, ${newLocal.cidade}`;
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await resp.json();
      
      if (data && data.length > 0) {
        setNewLocal(prev => ({
          ...prev,
          lat: data[0].lat.toString(),
          lng: data[0].lon.toString()
        }));
        toast.success(`Coordenadas refinadas para o número ${num}`);
      } else {
        toast.info(`Não foi possível achar a posição exata do número ${num}, mantendo centro da rua.`);
      }
    } catch (e) {
      console.error(e);
    }
    setSearchingNumber(false);
  };

  const validateCoords = (): { lat: number; lng: number } | null => {
    const lat = parseFloat(newLocal.lat);
    const lng = parseFloat(newLocal.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) { toast.warning(t('obras.invalidLat')); return null; }
    if (isNaN(lng) || lng < -180 || lng > 180) { toast.warning(t('obras.invalidLng')); return null; }
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
      toast.error(t('obras.saveError'));
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
      toast.error(t('obras.saveError'));
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dataService.excluirLocal(deleteTarget.id_local, empresaId);
      setLocais(prev => prev.filter(l => l.id_local !== deleteTarget.id_local));
      toast.success(`${deleteTarget.nome_empresa} removido com sucesso.`);
    } catch (err) {
      toast.error(t('obras.deleteError'));
    }
    setDeleting(false);
    setDeleteTarget(null);
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
    setShowAdvanced(false);
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
        <Card className="mb-6 border-emerald-200 bg-emerald-50/30 shadow-md">
          <form onSubmit={editing ? handleEdit : handleAdd} className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{editing ? t('obras.edit') : t('obras.new')}</h3>
              {editing && <span className="text-xs text-slate-400 font-mono">{editing.id_local}</span>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 grid grid-cols-4 gap-3 items-start">
                <div className="col-span-3 space-y-1.5 relative">
                  <label className="text-xs font-semibold text-slate-700">1. Buscar Rua / Avenida</label>
                  <AddressAutocomplete
                    value={newLocal.address}
                    onChange={(address) => setNewLocal({ ...newLocal, address })}
                    onSelect={handleAddressSelect}
                    placeholder="Ex: Avenida Paulista..."
                  />
                </div>
                <div className="col-span-1 space-y-1.5 relative">
                  <label className="text-xs font-semibold text-slate-700">Número</label>
                  <input
                    type="text"
                    placeholder="Ex: 1578"
                    value={newLocal.numero}
                    onChange={(e) => setNewLocal({ ...newLocal, numero: e.target.value })}
                    onBlur={(e) => handleNumberSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {searchingNumber && (
                    <Loader2 className="absolute right-3 top-9 w-4 h-4 text-emerald-500 animate-spin" />
                  )}
                </div>
              </div>

              {!editing && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">ID da Obra (Único)</label>
                  <input
                    type="text"
                    placeholder="Ex: OBRA-001"
                    value={newLocal.id}
                    onChange={(e) => setNewLocal({ ...newLocal, id: e.target.value })}
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nome da Obra / Empresa</label>
                <input
                  type="text"
                  placeholder={t('obras.namePlaceholder')}
                  value={newLocal.empresa}
                  onChange={(e) => setNewLocal({ ...newLocal, empresa: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Cidade</label>
                <input
                  type="text"
                  placeholder={t('obras.cityPlaceholder')}
                  value={newLocal.cidade}
                  onChange={(e) => setNewLocal({ ...newLocal, cidade: e.target.value })}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 mt-2 border-t border-slate-200/60 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer border-0 bg-transparent flex items-center gap-1 mb-3"
                >
                  {showAdvanced ? 'Ocultar configurações avançadas' : 'Mostrar configurações avançadas (Coordenadas e Raio)'}
                </button>
                
                {showAdvanced && (
                  <div className="grid sm:grid-cols-2 gap-4 bg-white/50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Raio de Check-in (Manual)</label>
                      <input
                        type="number"
                        placeholder={t('obras.radiusPlaceholder')}
                        value={newLocal.raio}
                        onChange={(e) => setNewLocal({ ...newLocal, raio: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Raio Automático (Calculado)</label>
                      <input
                        type="number"
                        placeholder={t('obras.radiusAutoPlaceholder')}
                        value={newLocal.raioAuto}
                        onChange={(e) => setNewLocal({ ...newLocal, raioAuto: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t('obras.latPlaceholder')}
                        value={newLocal.lat}
                        onChange={(e) => setNewLocal({ ...newLocal, lat: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder={t('obras.lngPlaceholder')}
                        value={newLocal.lng}
                        onChange={(e) => setNewLocal({ ...newLocal, lng: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleCaptureGps}
                        disabled={capturingGps}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-xl hover:bg-emerald-200 disabled:opacity-50 cursor-pointer border-0"
                      >
                        {capturingGps ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        {capturingGps ? 'Obtendo localização...' : 'Usar minha localização atual'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {newLocal.lat && newLocal.lng && (
                <div className="sm:col-span-2 flex items-center justify-between text-xs text-emerald-700 font-mono bg-emerald-100/50 rounded-lg px-4 py-2.5 border border-emerald-200">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Lat: {parseFloat(newLocal.lat).toFixed(6)} | Lng: {parseFloat(newLocal.lng).toFixed(6)}
                  </span>
                  {newLocal.raioAutoCalculated && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-200/50 px-2.5 py-1 rounded-full font-bold">
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
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">{t('obras.qrPreview')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-2 shrink-0">
                    <QRCodeCanvas value={`${window.location.origin}/checkin?local=${newLocal.id.toUpperCase()}&lat=${newLocal.lat}&lng=${newLocal.lng}&raio=${newLocal.raio}`} size={100} level="M" includeMargin={false} />
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono break-all">{`${window.location.origin}/checkin?local=${newLocal.id.toUpperCase()}&lat=${newLocal.lat}&lng=${newLocal.lng}&raio=${newLocal.raio}`}</p>
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {t('obras.qrCode')}
                  </button>
                  <a
                    href={`/checkin?local=${local.id_local}&lat=${local.latitude}&lng=${local.longitude}&raio=${local.raio_metros}`}
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
                    onClick={() => setDeleteTarget(local)}
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Link className="w-4 h-4" />
                  <span>{t('obras.autoCadastroTitle')}</span>
                </div>
                <p className="text-xs text-emerald-600">{t('obras.autoCadastroDesc')}</p>
                <div className="text-[10px] font-mono text-emerald-700 bg-white rounded-lg p-2 break-all">
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
                    toast.success(t('obras.linkCopied'));
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('obras.deleteConfirmTitle') || 'Excluir local de serviço?'}
        description={deleteTarget ? (t('obras.deleteConfirm', { name: deleteTarget.nome_empresa }) || `Tem certeza que deseja excluir ${deleteTarget.nome_empresa}? Esta ação não pode ser desfeita.`) : ''}
        confirmLabel={t('common.delete') || 'Excluir'}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}