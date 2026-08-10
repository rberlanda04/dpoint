import { useEffect, useRef, useState, useCallback } from 'react';
import { ObraPessoal, SessaoTrabalho } from '../types';
import { haversineDistance } from '../utils/geo';

interface GeofenceEvent {
  obra: ObraPessoal;
  eventType: 'enter' | 'exit';
  position: { lat: number; lng: number; accuracy: number };
  timestamp: string;
}

interface UseGeofenceWorkerOptions {
  obras: ObraPessoal[];
  sessoes: SessaoTrabalho[];
  enabled: boolean;
  onGeofenceEvent: (event: GeofenceEvent) => void;
  onNotification?: (title: string, body: string, tag: string) => void;
  minIntervalMs?: number;
}

export function useGeofenceWorker({
  obras,
  sessoes,
  enabled,
  onGeofenceEvent,
  onNotification,
  minIntervalMs = 5 * 60 * 1000,
}: UseGeofenceWorkerOptions) {
  const watchIdRef = useRef<number | null>(null);
  const lastEventRef = useRef<Map<string, number>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [nearbyObras, setNearbyObras] = useState<ObraPessoal[]>([]);

  const autoObras = obras.filter(o => o.ativa && o.raio_metros > 0);

  const getLastSessionToday = useCallback((obraId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return sessoes
      .filter(s => s.obra_id === obraId && s.data_hora.startsWith(today))
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())[0] || null;
  }, [sessoes]);

  const checkGeofences = useCallback((position: { lat: number; lng: number; accuracy: number }) => {
    const now = Date.now();

    autoObras.forEach(obra => {
      const radius = obra.raio_metros;
      const distance = haversineDistance(
        position.lat, position.lng,
        obra.latitude, obra.longitude
      );

      const isInside = distance <= radius + position.accuracy;
      const lastEventTime = lastEventRef.current.get(obra.id) || 0;

      if (now - lastEventTime < minIntervalMs) return;

      const prevStateKey = `geofence_worker_${obra.id}`;
      const prevInside = localStorage.getItem(prevStateKey) === 'true';

      if (isInside && !prevInside) {
        lastEventRef.current.set(obra.id, now);
        localStorage.setItem(prevStateKey, 'true');
        onGeofenceEvent({
          obra,
          eventType: 'enter',
          position,
          timestamp: new Date().toISOString(),
        });
        if (onNotification) {
          onNotification(
            '📍 Entrada detectada',
            `${obra.nome} — ${obra.endereco}`,
            `geofence-worker-enter-${obra.id}`
          );
        }
      } else if (!isInside && prevInside) {
        lastEventRef.current.set(obra.id, now);
        localStorage.setItem(prevStateKey, 'false');
        onGeofenceEvent({
          obra,
          eventType: 'exit',
          position,
          timestamp: new Date().toISOString(),
        });
        if (onNotification) {
          onNotification(
            '📍 Saída detectada',
            `${obra.nome} — ${obra.endereco}`,
            `geofence-worker-exit-${obra.id}`
          );
        }
      }
    });

    const nearby = autoObras
      .map(obra => ({
        obra,
        distance: haversineDistance(position.lat, position.lng, obra.latitude, obra.longitude),
      }))
      .filter(d => d.distance <= (d.obra.raio_metros + position.accuracy) * 1.5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(d => d.obra);
    
    setNearbyObras(nearby);
  }, [autoObras, minIntervalMs, onGeofenceEvent, onNotification]);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);

    navigator.geolocation.getCurrentPosition(
      pos => {
        const posObj = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setCurrentPosition(posObj);
        checkGeofences(posObj);
      },
      err => console.warn('Erro ao obter posição inicial:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

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
    nearbyObras,
  };
}