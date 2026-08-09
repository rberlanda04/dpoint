/**
 * Upload de fotos de evidência para o Firebase Storage.
 * Fallback: retorna o próprio data URL caso o Storage não esteja disponível,
 * garantindo que o registro nunca seja perdido por falha no upload.
 */

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Faz upload de uma foto (data URL JPEG) para o Storage.
 * @param dataUrl Imagem em formato data URL (base64)
 * @param registroId ID do registro de ponto associado
 * @returns URL pública da foto, ou o data URL original em caso de falha
 */
export async function uploadPhotoEvidence(dataUrl: string, registroId: string): Promise<string> {
  try {
    if (!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) {
      return dataUrl;
    }
    const photoRef = ref(storage, `evidencias/${registroId}.jpg`);
    await uploadString(photoRef, dataUrl, 'data_url');
    return await getDownloadURL(photoRef);
  } catch (error) {
    console.warn('Falha no upload da foto para o Storage. Usando data URL como fallback.', error);
    return dataUrl;
  }
}
