import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Play, Square, User, Bell, BellOff, Navigation, CheckCircle2, Loader2, AlertTriangle, Settings } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import PageHeader from '../components/layouts/PageHeader';
import AutoCheckinPrompt from '../components/AutoCheckinPrompt';
import { dataService } from '../utils/gasClient';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { useGeofenceMonitor } from '../hooks/useGeofenceMonitor';
import { useGpsPermission } from '../hooks/useGpsPermission';
import { haversineDistance } from '../utils/geo';
import { Funcionario, LocalServico, RegistroPonto } from '../types';

export default function AutoCheckinPage() {
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t } = useI18n();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [locais, setLocais] = useState<LocalServico[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [monitoring, setMonitoring] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [lastEvent, setLastEvent] = useState<{ type: string; local: string; time: string } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptEvent, setPromptEvent] = useState<{ local: LocalServico; eventType: 'enter' | 'exit'; position: { lat: number; lng: number; accuracy: number } } | null>(null);

  const gps = useGpsPermission();

  const handleToggleMonitoring = async () => {
    if (monitoring) {
      setMonitoring(false);
      gps.stopWatching();
      return;
    }
    if (gps.permissionState !== 'granted') {
      const ok = await gps.requestPermission();
      if (!ok) return;
    }
    gps.watchPosition();
    setMonitoring(true);
  };

  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;
  const selectedFunc = funcionarios.find(f => f.id_funcionario === selectedFuncId) || null;

  useEffect(() => {
    dataService.loadAllData(empresaId).then(db => {
      setFuncionarios(db.funcionarios.filter(f => f.status === 'Ativo'));
      setLocais(db.locais);
      setRegistros(db.registros);
      setLoading(false);
    }).catch(err => {
      console.error('Erro ao carregar dados:', err);
      setLoading(false);
    });
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, [empresaId]);

  const requestNotifPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  };

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (notifPermission === 'granted') {
      try { new Notification(title, { body, icon: '/favicon.ico', tag }); } catch {}
    }
  }, [notifPermission]);

  const autoLocais = useMemo(() => locais.filter(l => l.raio_auto_checkin && l.raio_auto_checkin > 0), [locais]);

  const handleGeofenceEvent = useCallback(async (event: { local: LocalServico; eventType: 'enter' | 'exit'; position: { lat: number; lng: number; accuracy: number }; timestamp: string }) => {
    if (!selectedFunc) return;
    const { local, eventType, position } = event;

    // Notification already sent by useGeofenceMonitor via onNotification
    // Open prompt for user confirmation
    setPromptEvent({ local, eventType, position });
    setPromptOpen(true);
  }, [selectedFunc, t]);

  const { nearbyLocais } = useGeofenceMonitor({
    locais,
    registros,
    enabled: monitoring && !!selectedFunc,
    currentPosition: gps.currentPosition,
    onGeofenceEvent: handleGeofenceEvent,
    onNotification: sendNotification,
  });

  const isMonitoring = monitoring && !!gps.currentPosition;

  const handlePromptConfirm = useCallback(async (data: { observacao: string; photoUrl: string | null; tipo: 'Check-in' | 'Check-out' }) => {
    if (!promptEvent || !selectedFunc) return;
    const { local, eventType, position } = promptEvent;

    const registro: RegistroPonto = {
      id_registro: `AUTO-${Date.now()}`,
      id_funcionario: selectedFunc.id_funcionario,
      id_local: local.id_local,
      empresa_id: local.empresa_id || selectedFunc.empresa_id || '',
      tipo: data.tipo,
      data_hora: new Date().toISOString(),
      latitude_registro: position.lat,
      longitude_registro: position.lng,
      precisao_gps: Math.round(position.accuracy),
      observacao: data.observacao || 'Auto check-in/out por geofence',
      nome_funcionario: selectedFunc.nome,
      nome_local: local.nome_empresa,
      dentro_geofence: true,
      tipo_verificacao: 'GPS',
      foto_url: data.photoUrl || undefined,
      auto: true,
    };

    try {
      await dataService.registrarPonto(registro);
      setRegistros(prev => [registro, ...prev]);
      setLastEvent({
        type: data.tipo,
        local: local.nome_empresa,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error('Erro ao registrar ponto automático:', err);
    }
    setPromptOpen(false);
    setPromptEvent(null);
  }, [promptEvent, selectedFunc]);

  const handlePromptDismiss = useCallback((tipo: 'Check-in' | 'Check-out') => {
    if (tipo === 'Check-out') return; // Cannot dismiss checkout
    // For check-in, save auto record
    if (!promptEvent || !selectedFunc) return;
    const { local, position } = promptEvent;

    const registro: RegistroPonto = {
      id_registro: `AUTO-${Date.now()}`,
      id_funcionario: selectedFunc.id_funcionario,
      id_local: local.id_local,
      empresa_id: local.empresa_id || selectedFunc.empresa_id || '',
      tipo: 'Check-in',
      data_hora: new Date().toISOString(),
      latitude_registro: position.lat,
      longitude_registro: position.lng,
      precisao_gps: Math.round(position.accuracy),
      observacao: 'Auto check-in por geofence',
      nome_funcionario: selectedFunc.nome,
      nome_local: local.nome_empresa,
      dentro_geofence: true,
      tipo_verificacao: 'GPS',
      auto: true,
    };

    dataService.registrarPonto(registro).then(() => {
      setRegistros(prev => [registro, ...prev]);
      setLastEvent({
        type: 'Check-in',
        local: local.nome_empresa,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      });
    }).catch(err => {
      console.error('Erro ao registrar ponto automático:', err);
    });
    setPromptOpen(false);
    setPromptEvent(null);
  }, [promptEvent, selectedFunc]);

  const todayRecords = useMemo(() => {
    if (!selectedFunc) return [];
    const today = new Date().toISOString().split('T')[0];
    return registros
      .filter(r => r.id_funcionario === selectedFunc.id_funcionario && r.data_hora.startsWith(today) && r.auto)
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
      .slice(0, 20);
  }, [registros, selectedFunc]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title={t('autoCheckin.title')} subtitle={t('autoCheckin.subtitle')} />

      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t('autoCheckin.selectEmployee')}</h3>
          </div>
          <select
            value={selectedFuncId}
            onChange={(e) => setSelectedFuncId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">{t('autoCheckin.selectPlaceholder')}</option>
            {funcionarios.map(f => (
              <option key={f.id_funcionario} value={f.id_funcionario}>{f.nome} — {f.cargo}</option>
            ))}
          </select>
        </div>
      </Card>

      {notifPermission !== 'granted' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellOff className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">{t('autoCheckin.notifDisabled')}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={requestNotifPermission}>
              <Bell className="w-3.5 h-3.5 mr-1" />
              {t('autoCheckin.enableNotif')}
            </Button>
          </div>
        </Card>
      )}

      {gps.permissionState === 'denied' && (
        <Card className="border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">{t('autoCheckin.gpsDenied')}</p>
              <p className="text-xs text-red-600 mt-1">{t('autoCheckin.gpsDeniedHelp')}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => window.open('https://support.google.com/chrome/answer/142065', '_blank')}>
              <Settings className="w-3.5 h-3.5 mr-1" />
              {t('autoCheckin.howToEnable')}
            </Button>
          </div>
        </Card>
      )}

      {gps.permissionState === 'unavailable' && (
        <Card className="border-red-200 bg-red-50/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{t('autoCheckin.gpsUnavailable')}</p>
          </div>
        </Card>
      )}

      {gps.error && gps.permissionState !== 'denied' && gps.permissionState !== 'unavailable' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">{gps.error}</p>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMonitoring ? (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              )}
              <span className="text-sm font-semibold text-slate-700">
                {isMonitoring ? t('autoCheckin.active') : t('autoCheckin.inactive')}
              </span>
            </div>
            <Button
              size="sm"
              variant={isMonitoring ? 'secondary' : 'primary'}
              onClick={handleToggleMonitoring}
              disabled={!selectedFunc || gps.loading}
            >
              {gps.loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : isMonitoring ? (
                <Square className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1" />
              )}
              {isMonitoring ? t('autoCheckin.stop') : t('autoCheckin.start')}
            </Button>
          </div>

          {(gps.currentPosition) && (
            <div className="text-xs text-slate-500 font-mono bg-slate-50 rounded-lg px-3 py-2">
              <Navigation className="w-3 h-3 inline mr-1" />
              {(gps.currentPosition)!.lat.toFixed(6)}, {(gps.currentPosition)!.lng.toFixed(6)}
              {gps.currentPosition && <span className="text-slate-400 ml-2">±{Math.round(gps.currentPosition.accuracy)}m</span>}
            </div>
          )}

          {lastEvent && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lastEvent.type}: {lastEvent.local} ({lastEvent.time})</span>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('autoCheckin.sites')} ({autoLocais.length})</h3>
        {autoLocais.length === 0 ? (
          <EmptyState icon={<MapPin className="w-6 h-6" />} title={t('autoCheckin.noSites')} description={t('autoCheckin.noSitesDesc')} />
        ) : (
          <div className="space-y-2">
            {autoLocais.map(local => {
              const isNearby = nearbyLocais.some(n => n.id_local === local.id_local);
              const distance = gps.currentPosition
                ? Math.round(haversineDistance(gps.currentPosition.lat, gps.currentPosition.lng, local.latitude, local.longitude))
                : null;
              return (
                <div key={local.id_local} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isNearby ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{local.nome_empresa}</p>
                    <p className="text-xs text-slate-400">{local.cidade} · {local.id_local}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={isNearby ? 'success' : 'default'}>{local.raio_auto_checkin || local.raio_metros}m</Badge>
                    {distance !== null && <p className="text-[10px] text-slate-400 mt-0.5">{distance}m {t('autoCheckin.distance')}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {todayRecords.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('autoCheckin.todayRecords')}</h3>
          <div className="space-y-2">
            {todayRecords.map(r => (
              <div key={r.id_registro} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={r.tipo === 'Check-in' ? 'success' : 'default'}>{r.tipo}</Badge>
                  <span className="text-slate-600">{r.nome_local}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {new Date(r.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AutoCheckinPrompt
        isOpen={promptOpen}
        onClose={() => { setPromptOpen(false); setPromptEvent(null); }}
        local={promptEvent?.local || null}
        eventType={promptEvent?.eventType || 'enter'}
        position={promptEvent?.position || { lat: 0, lng: 0, accuracy: 0 }}
        selectedFunc={selectedFunc ? { id_funcionario: selectedFunc.id_funcionario, nome: selectedFunc.nome } : null}
        onConfirm={handlePromptConfirm}
        onDismiss={handlePromptDismiss}
        requirePhoto={promptEvent?.eventType === 'exit'}
        requireObservation={promptEvent?.eventType === 'exit'}
      />
    </div>
  );
}
