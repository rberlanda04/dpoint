/**
 * Funções geográficas utilitárias.
 */

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Verifica se o ponto está dentro do raio, considerando a acurácia do GPS.
 * A comparação é: distância <= raio + acurácia
 * Isso permite que um fix GPS com 15m de erro ainda seja aceito dentro de um raio de 50m.
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
  accuracyMeters: number = 0
): boolean {
  const distance = haversineDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusMeters + accuracyMeters;
}