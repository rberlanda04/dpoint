import { useState, useEffect, useCallback, useRef } from 'react';

export type GpsPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unavailable';

interface UseGpsPermissionReturn {
  permissionState: GpsPermissionState;
  currentPosition: { lat: number; lng: number; accuracy: number } | null;
  error: string | null;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
  watchPosition: () => void;
  stopWatching: () => void;
  isWatching: boolean;
}

export function useGpsPermission(): UseGpsPermissionReturn {
  const [permissionState, setPermissionState] = useState<GpsPermissionState>('unknown');
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const checkPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      return;
    }

    try {
      if ('permissions' in navigator) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(status.state as GpsPermissionState);
        status.onchange = () => {
          setPermissionState(status.state as GpsPermissionState);
        };
      } else {
        setPermissionState('prompt');
      }
    } catch {
      setPermissionState('prompt');
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError('Geolocalização não disponível neste dispositivo');
      return false;
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setPermissionState('granted');
          setLoading(false);
          resolve(true);
        },
        (err) => {
          setLoading(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setPermissionState('denied');
              setError('Permissão de localização negada. Permita o acesso nas configurações do navegador.');
              resolve(false);
              break;
            case err.POSITION_UNAVAILABLE:
              setPermissionState('unavailable');
              setError('Localização indisponível. Verifique se o GPS está ativado.');
              resolve(false);
              break;
            case err.TIMEOUT:
              setError('Tempo esgotado ao obter localização. Tente novamente.');
              resolve(false);
              break;
            default:
              setError('Erro ao obter localização.');
              resolve(false);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    });
  }, []);

  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) return;

    const onPos = (pos: GeolocationPosition) => {
      setCurrentPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setError(null);
    };

    const onErr = (err: GeolocationPositionError) => {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          setPermissionState('denied');
          setError('Permissão de localização negada.');
          setIsWatching(false);
          break;
        case err.POSITION_UNAVAILABLE:
          setError('Localização indisponível.');
          break;
        case err.TIMEOUT:
          break;
      }
    };

    navigator.geolocation.getCurrentPosition(onPos, onErr, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    const id = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    watchIdRef.current = id;
    setIsWatching(true);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    permissionState,
    currentPosition,
    error,
    loading,
    requestPermission,
    watchPosition,
    stopWatching,
    isWatching,
  };
}
