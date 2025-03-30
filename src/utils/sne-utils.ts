import { sne0_1Service, EncryptedChunk } from '../services/SNEService';

/**
 * Create an encryption session for streaming
 * @param streamId Optional associated stream ID
 */
export async function createStreamingSession(streamId?: string): Promise<string> {
  const session = await sne0_1Service.createSession(streamId, {
    mode: 'streaming'
  });
  
  return session.sessionId;
}

/**
 * Encrypt a text message using a session
 * @param sessionId Encryption session ID
 * @param message Message to encrypt
 */
export async function encryptMessage(sessionId: string, message: string): Promise<EncryptedChunk> {
  return sne0_1Service.encrypt(sessionId, message);
}

/**
 * Decrypt a message to text
 * @param chunk Encrypted chunk
 */
export async function decryptMessage(chunk: EncryptedChunk): Promise<string> {
  const decrypted = await sne0_1Service.decrypt(chunk);
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt a binary file
 * @param sessionId Encryption session ID
 * @param file File to encrypt
 */
export async function encryptFile(sessionId: string, file: File): Promise<EncryptedChunk> {
  const arrayBuffer = await file.arrayBuffer();
  
  return sne0_1Service.encrypt(sessionId, arrayBuffer, {
    filename: file.name,
    fileType: file.type,
    lastModified: file.lastModified
  });
}

/**
 * Calculate estimated overhead percentage added by encryption
 * @param session Session ID or metrics
 */
export function calculateEncryptionOverhead(session: string | { bytesEncrypted: number, bytesDecrypted: number }): number {
  let metrics;
  
  if (typeof session === 'string') {
    const sessionInfo = sne0_1Service.getSessionInfo(session);
    if (!sessionInfo) {
      return 0;
    }
    metrics = sessionInfo.metrics;
  } else {
    metrics = session;
  }
  
  if (metrics.bytesDecrypted === 0) {
    return 0;
  }
  
  return ((metrics.bytesEncrypted - metrics.bytesDecrypted) / metrics.bytesDecrypted) * 100;
}

/**
 * Format chunk information for display
 * @param chunk Encrypted chunk
 */
export function formatChunkInfo(chunk: EncryptedChunk): string {
  return `Chunk #${chunk.sequence} - Session: ${chunk.sessionId} - Key: ${chunk.keyId.substring(0, 8)}... - ${new Date(chunk.timestamp).toISOString()}`;
}

/**
 * Create a secure streaming URL with encrypted parameters
 * @param baseUrl Base streaming URL
 * @param params Parameters to encrypt
 * @param sessionId Encryption session ID
 */
export async function createSecureStreamUrl(
  baseUrl: string,
  params: Record<string, string>,
  sessionId: string
): Promise<string> {
  // Convert params to JSON string
  const paramsJson = JSON.stringify(params);
  
  // Encrypt params
  const encryptedChunk = await encryptMessage(sessionId, paramsJson);
  
  // Create URL with encrypted parameters
  return `${baseUrl}?sne=${encodeURIComponent(encryptedChunk.data)}&sid=${encodeURIComponent(encryptedChunk.sessionId)}&kid=${encodeURIComponent(encryptedChunk.keyId)}&iv=${encodeURIComponent(encryptedChunk.iv)}`;
}
