import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Clock, PlayCircle, PauseCircle, Loader2, AlertTriangle, CheckCircle2, Camera, X } from 'lucide-react';
import { Button, Card, Badge, EmptyState } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import WorkerAutoCheckinOverlay from '../../components/worker/WorkerAutoCheckinOverlay';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useWorkerData } from '../../hooks/useWorkerData';
import { useGeofenceWorker } from '../../hooks/useGeofenceWorker';
import { useI18n } from '../../i18n';
import { SessaoTrabalho } from '../../types';
import { dataService } from '../../utils/gasClient';
import { generateId } from '../../utils/crypto';
import { uploadPhotoEvidence } from '../../utils/storage';

function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function WorkerCheckInPage() {
  const { t } = useI18n();
  const { trabalhador } = useWorkerAuth();
  const { obras, sessoes, refresh } = useWorkerData(trabalhador?.id || null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [positionLoading, setPositionLoading] = useState(false);
  const [positionError, setPositionError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [selectedObra, setSelectedObra] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayEvent, setOverlayEvent] = useState<{ obra: typeof ativas[0]; eventType: 'enter' | 'exit'; position: { lat: number; lng: number; accuracy: number } } | null>(null);

  const ativas = obras.filter(o => o.ativa);

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/favicon.ico', tag }); } catch {}
    }
  }, []);

  const { isMonitoring, nearbyObras } = useGeofenceWorker({
    obras: ativas,
    sessoes: sessoes,
    enabled: !!trabalhador && !!trabalhador.id && ativas.length > 0,
    onGeofenceEvent: (event) => {
      const { obra, eventType, position } = event;
      const title = eventType === 'enter' ? '📍 Entrada detectada' : '📍 Saída detectada';
      sendNotification(title, `${obra.nome} — ${obra.endereco}`, `geofence-worker-${eventType}-${obra.id}`);
      setOverlayEvent({ obra, eventType, position });
      setOverlayOpen(true);
    },
    onNotification: sendNotification,
    minIntervalMs: 3 * 60 * 1000,
  });

  const getLastSessionToday = useCallback((obraId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return sessoes
      .filter(s => s.obra_id === obraId && s.data_hora.startsWith(today))
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())[0] || null;
  }, [sessoes]);

  const getSuggestedTipo = (obraId: string): 'Check-in' | 'Check-out' => {
    const last = getLastSessionToday(obraId);
    if (!last) return 'Check-in';
    return last.tipo === 'inicio' ? 'Check-out' : 'Check-in';
  };

  const getSuggestedSessaoTipo = (obraId: string): 'inicio' | 'fim' | 'pausa_inicio' | 'pausa_fim' => {
    const last = getLastSessionToday(obraId);
    if (!last) return 'inicio';
    if (last.tipo === 'inicio') return 'fim';
    if (last.tipo === 'fim') return 'inicio';
    if (last.tipo === 'pausa_inicio') return 'pausa_fim';
    return 'pausa_inicio';
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setPositionError(t('worker.checkin.gpsCarregando'));
      return;
    }
    setPositionLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setPositionLoading(false);
        setPositionError('');
      },
      (err) => {
        setPositionError(err.message);
        setPositionLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleRegister = async (obraId: string) => {
    if (!trabalhador || !currentPosition) return;
    setRegistering(true);

    try {
      const obra = obras.find(o => o.id === obraId);
      const tipo = getSuggestedSessaoTipo(obraId);
      const id = generateId('sess');

      let fotoFinal: string | null = null;
      if (photoUrl) {
        fotoFinal = await uploadPhotoEvidence(photoUrl, id);
      }

      const sessao: SessaoTrabalho = {
        id,
        trabalhador_id: trabalhador.id,
        obra_id: obraId,
        tipo,
        data_hora: new Date().toISOString(),
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        dentro_geofence: nearbyObras.some(o => o.id === obraId) || true,
        observacao: observacao || undefined,
        foto_url: fotoFinal || undefined,
      };

      await dataService.saveSessaoTrabalho(sessao);
      setObservacao('');
      setPhotoUrl(null);
      setSelectedObra(null);
      await refresh();
    } catch (err) {
      console.error('Erro ao registrar ponto:', err);
    }
    setRegistering(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Foto muito grande. Máximo 10MB.');
        return;
      }
      const compressed = await compressImage(file, 800, 0.6);
      setPhotoUrl(compressed);
    }
  };

  const handleOverlayConfirm = async (data: { observacao: string; photoUrl: string | null; tipo: 'inicio' | 'fim' }) => {
    if (!trabalhador || !overlayEvent) return;
    setRegistering(true);

    try {
      const id = generateId('sess');
      let fotoFinal: string | null = null;
      if (data.photoUrl) {
        fotoFinal = await uploadPhotoEvidence(data.photoUrl, id);
      }

      const sessao: SessaoTrabalho = {
        id,
        trabalhador_id: trabalhador.id,
        obra_id: overlayEvent.obra.id,
        tipo: data.tipo,
        data_hora: new Date().toISOString(),
        latitude: overlayEvent.position.lat,
        longitude: overlayEvent.position.lng,
        dentro_geofence: true,
        observacao: data.observacao || undefined,
        foto_url: fotoFinal || undefined,
      };

      await dataService.saveSessaoTrabalho(sessao);
      await refresh();
    } catch (err) {
      console.error('Erro ao registrar sessão automática:', err);
    }
    setRegistering(false);
    setOverlayOpen(false);
    setOverlayEvent(null);
  };

  const handleOverlayDismiss = () => {
    setOverlayOpen(false);
    setOverlayEvent(null);
  };

  if (!trabalhador) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title={t('worker.checkin.semObra')}
          description={t('worker.checkin.selecionarObra')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('worker.checkin.title')}
        subtitle={isMonitoring ? t('worker.checkin.autocheckin') : undefined}
        action={
          <Button icon={<MapPin className="w-4 h-4" />} onClick={handleGetLocation} disabled={positionLoading}>
            {positionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'GPS'}
          </Button>
        }
      />

      {positionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {positionError}
        </div>
      )}

      {!currentPosition && !positionLoading && (
        <Card className="mb-6 border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-700">{t('worker.checkin.semObra')}</p>
              <p className="text-xs text-amber-600">{t('worker.checkin.gpsCarregando')}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-3" onClick={handleGetLocation}>
            {t('worker.checkin.selecionarObra')}
          </Button>
        </Card>
      )}

      {ativas.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-8 h-8" />}
          title={t('worker.obras.notFound')}
          description={t('worker.obras.notFoundDesc')}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {ativas.map((obra) => {
            const last = getLastSessionToday(obra.id);
            const suggestedTipo = getSuggestedTipo(obra.id);
            const suggestedSessaoTipo = getSuggestedSessaoTipo(obra.id);
            const isEditing = selectedObra === obra.id;

            return (
              <Card key={obra.id} hover>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{obra.nome}</p>
                      <p className="text-xs text-slate-400">{obra.cidade} · {obra.endereco}</p>
                    </div>
                    <Badge variant="success">{obra.ativa ? t('worker.obras.ativa') : t('worker.obras.inativa')}</Badge>
                  </div>

                  {last && (
                    <div className="text-xs text-slate-500">
                      Último registro: {new Date(last.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' '}({last.tipo === 'inicio' ? 'Entrada' : 'Saída'})
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="bg-white px-2 py-0.5 rounded">{obra.latitude.toFixed(5)}, {obra.longitude.toFixed(5)}</span>
                    <span>{obra.raio_metros}m</span>
                  </div>

                  {currentPosition && currentPosition.lat === obra.latitude && (
                    <div className={`p-2 rounded-lg text-xs ${
                      suggestedTipo === 'Check-in' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {t('worker.checkin.dentroGeofence')} ({suggestedTipo === 'Check-in' ? 'entrada' : 'saída'})
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <textarea
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        placeholder={t('checkin.obsPlaceholder')}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                      {photoUrl ? (
                        <div className="relative">
                          <img src={photoUrl} alt="Evidência" className="w-full h-24 object-cover rounded-xl border border-slate-200" />
                          <button
                            onClick={() => setPhotoUrl(null)}
                            className="absolute top-1 right-1 bg-black/50 text-white px-2 py-0.5 text-xs rounded cursor-pointer border-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhoto}
                          className="text-xs text-slate-500 file:ml-0"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleRegister(obra.id)}
                          disabled={registering || !currentPosition}
                        >
                          {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : t('worker.checkin.registrar')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedObra(null); setObservacao(''); setPhotoUrl(null); }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant={suggestedSessaoTipo === 'inicio' ? 'primary' : 'secondary'}
                      icon={suggestedSessaoTipo === 'inicio' ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                      onClick={() => setSelectedObra(obra.id)}
                      disabled={!currentPosition}
                    >
                      {suggestedSessaoTipo === 'inicio' ? 'Entrada' : 'Saída'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <WorkerAutoCheckinOverlay
        isOpen={overlayOpen}
        onClose={handleOverlayDismiss}
        obra={overlayEvent?.obra || null}
        eventType={overlayEvent?.eventType || 'enter'}
        position={overlayEvent?.position || { lat: 0, lng: 0, accuracy: 0 }}
        workerName={trabalhador?.nome || ''}
        onConfirm={handleOverlayConfirm}
        onDismiss={handleOverlayDismiss}
      />
    </div>
  );
}
