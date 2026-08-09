import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { LocalServico, RegistroPonto } from '../types';
import { haversineDistance } from '../utils/geo';

interface GeofenceEvent {
  local: LocalServico;
  eventType: 'enter' | 'exit';
  position: { lat: number; lng: number; accuracy: number };
  timestamp: string;
}

interface UseGeofenceMonitorOptions {
  locais: LocalServico[];
  registros: RegistroPonto[];
  enabled: boolean;
  onGeofenceEvent: (event: GeofenceEvent) => void;
  minIntervalMs?: number; // intervalo mínimo entre eventos do mesmo local
}

export function useGeofenceMonitor({
  locais,
  registros,
  enabled,
  onGeofenceEvent,
  minIntervalMs = 5 * 60 * 1000, // 5 min entre eventos do mesmo local
}: UseGeofenceMonitorOptions) {
  const watchIdRef = useRef<number | null>(null);
  const lastEventRef = useRef<Map<string, number>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [nearbyLocais, setNearbyLocais] = useState<LocalServico[]>([]);

  // Filtra locais que têm raio de auto check-in configurado (memoizado para
  // não recriar checkGeofences/watchPosition a cada render)
  const autoLocais = useMemo(
    () => locais.filter(l => l.raio_auto_checkin && l.raio_auto_checkin > 0),
    [locais]
  );

  const checkGeofences = useCallback((position: { lat: number; lng: number; accuracy: number }) => {
    const now = Date.now();

    autoLocais.forEach(local => {
      const radius = local.raio_auto_checkin!;
      const distance = haversineDistance(
        position.lat, position.lng,
        local.latitude, local.longitude
      );

      const isInside = distance <= radius;
      const lastEventTime = lastEventRef.current.get(local.id_local) || 0;

      // Evita eventos duplicados no intervalo mínimo
      if (now - lastEventTime < minIntervalMs) return;

      // Verifica qual deveria ser o próximo tipo de ponto baseado no último registro
      // Como não sabemos o funcionário aqui, o evento é disparado e a página decide
      // se é check-in ou check-out baseado no último registro do funcionário selecionado
      
      // Para detectar entrada/saída, comparamos com estado anterior
      // Simplificação: se está dentro e último evento foi 'exit' (ou nunca houve), dispara 'enter'
      // Se está fora e último evento foi 'enter', dispara 'exit'
      
      // Usamos localStorage para persistir estado entre sessões
      const prevStateKey = `geofence_state_${local.id_local}`;
      const prevInside = localStorage.getItem(prevStateKey) === 'true';

      if (isInside && !prevInside) {
        // ENTROU no geofence
        lastEventRef.current.set(local.id_local, now);
        localStorage.setItem(prevStateKey, 'true');
        onGeofenceEvent({
          local,
          eventType: 'enter',
          position,
          timestamp: new Date().toISOString(),
        });
      } else if (!isInside && prevInside) {
        // SAIU do geofence
        lastEventRef.current.set(local.id_local, now);
        localStorage.setItem(prevStateKey, 'false');
        onGeofenceEvent({
          local,
          eventType: 'exit',
          position,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Atualiza lista de locais próximos (para UI)
    const nearby = autoLocais
      .map(local => ({
        local,
        distance: haversineDistance(position.lat, position.lng, local.latitude, local.longitude),
      }))
      .filter(d => d.distance <= (d.local.raio_auto_checkin! * 2))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(d => d.local);
    
    setNearbyLocais(nearby);
  }, [autoLocais, minIntervalMs, onGeofenceEvent]);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);

    // Posição inicial
    navigator.geolocation.getCurrentPosition(
      pos => {
        const posObj = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCurrentPosition(posObj);
        checkGeofences(posObj);
      },
      err => console.warn('Erro ao obter posição inicial:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    // Watch position para monitoramento contínuo
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const posObj = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCurrentPosition(posObj);
        checkGeofences(posObj);
      },
      err => console.warn('Erro no watchPosition:', err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsMonitoring(false);
    };
  }, [enabled, checkGeofences]);

  return {
    isMonitoring,
    currentPosition,
    nearbyLocais,
  };
}