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
  currentPosition: { lat: number; lng: number; accuracy: number } | null;
  onGeofenceEvent: (event: GeofenceEvent) => void;
  onNotification?: (title: string, body: string, tag: string) => void;
  minIntervalMs?: number;
}

export function useGeofenceMonitor({
  locais,
  registros,
  enabled,
  currentPosition,
  onGeofenceEvent,
  onNotification,
  minIntervalMs = 5 * 60 * 1000,
}: UseGeofenceMonitorOptions) {
  const lastEventRef = useRef<Map<string, number>>(new Map());
  const [nearbyLocais, setNearbyLocais] = useState<LocalServico[]>([]);

  const autoLocais = useMemo(
    () => locais.filter(l => l.raio_auto_checkin && l.raio_auto_checkin > 0),
    [locais]
  );

  useEffect(() => {
    if (!enabled || !currentPosition) return;

    const now = Date.now();

    autoLocais.forEach(local => {
      const radius = local.raio_auto_checkin!;
      const distance = haversineDistance(
        currentPosition.lat, currentPosition.lng,
        local.latitude, local.longitude
      );

      const isInside = distance <= radius + currentPosition.accuracy;
      const lastEventTime = lastEventRef.current.get(local.id_local) || 0;

      if (now - lastEventTime < minIntervalMs) return;

      const prevStateKey = `geofence_state_${local.id_local}`;
      const prevInside = localStorage.getItem(prevStateKey) === 'true';

      if (isInside && !prevInside) {
        lastEventRef.current.set(local.id_local, now);
        localStorage.setItem(prevStateKey, 'true');
        onGeofenceEvent({
          local,
          eventType: 'enter',
          position: currentPosition,
          timestamp: new Date().toISOString(),
        });
        if (onNotification) {
          onNotification(
            '📍 Entrada detectada',
            `${local.nome_empresa} — ${local.cidade}`,
            `geofence-enter-${local.id_local}`
          );
        }
      } else if (!isInside && prevInside) {
        lastEventRef.current.set(local.id_local, now);
        localStorage.setItem(prevStateKey, 'false');
        onGeofenceEvent({
          local,
          eventType: 'exit',
          position: currentPosition,
          timestamp: new Date().toISOString(),
        });
        if (onNotification) {
          onNotification(
            '📍 Saída detectada',
            `${local.nome_empresa} — ${local.cidade}`,
            `geofence-exit-${local.id_local}`
          );
        }
      }
    });

    const nearby = autoLocais
      .map(local => ({
        local,
        distance: haversineDistance(currentPosition.lat, currentPosition.lng, local.latitude, local.longitude),
      }))
      .filter(d => d.distance <= (d.local.raio_auto_checkin! + currentPosition.accuracy) * 1.5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(d => d.local);

    setNearbyLocais(nearby);
  }, [enabled, currentPosition, autoLocais, minIntervalMs, onGeofenceEvent, onNotification]);

  return {
    nearbyLocais,
  };
}