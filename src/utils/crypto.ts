/**
 * Geração de tokens e IDs criptograficamente seguros.
 * Substitui Math.random() em contextos sensíveis (convites, IDs de registro).
 */

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/** Token seguro para links de convite (padrão: 48 caracteres). */
export function generateSecureToken(length = 48): string {
  return Array.from({ length }, () => TOKEN_ALPHABET[secureRandomInt(TOKEN_ALPHABET.length)]).join('');
}

/** ID único com prefixo, ex: generateId('REG') => "REG-1712345678901-a3f9k2" */
export function generateId(prefix: string): string {
  const suffix = Array.from({ length: 6 }, () => TOKEN_ALPHABET[secureRandomInt(TOKEN_ALPHABET.length)]).join('');
  return `${prefix}-${Date.now()}-${suffix}`;
}
