import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes — 128-bit IV
const AUTH_TAG_LENGTH = 16; // bytes — 128-bit GCM auth tag

/**
 * Serviço de criptografia para tokens OAuth em repouso.
 *
 * Algoritmo: AES-256-GCM (autenticado — protege contra adulteração)
 * Chave:     32 bytes (256 bits), fornecida via TOKEN_ENCRYPTION_KEY (hex 64 chars)
 * IV:        16 bytes aleatórios gerados por operação de encrypt
 *
 * Formato armazenado no banco:
 *   <iv_hex (32 chars)>:<authTag_hex (32 chars)>:<ciphertext_hex (N chars)>
 *
 * Migração transparente:
 *   Tokens gravados em texto puro (antes desta feature) são detectados
 *   pelo método `isEncrypted()` e passados sem alteração em `decrypt()`.
 *   Na próxima vez que o token for ATUALIZADO, será re-escrito já criptografado.
 */
@Injectable()
export class TokenCryptoService {
  private readonly logger = new Logger(TokenCryptoService.name);
  private readonly key: Buffer | null = null;

  // Padrão de detecção: iv(32) : authTag(32) : ciphertext(>=2 hex chars)
  private static readonly ENC_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]{2,}$/;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('crypto.tokenEncryptionKey');

    if (keyHex) {
      const buf = Buffer.from(keyHex, 'hex');
      if (buf.length !== 32) {
        throw new Error(
          'TOKEN_ENCRYPTION_KEY inválida: deve ter exatamente 64 caracteres hexadecimais (32 bytes).',
        );
      }
      this.key = buf;
      this.logger.log('Criptografia de tokens OAuth ativa (AES-256-GCM).');
    } else {
      this.logger.warn(
        'TOKEN_ENCRYPTION_KEY não configurada — tokens OAuth serão armazenados em ' +
          'texto puro. Configure a variável em produção para proteger os tokens.',
      );
    }
  }

  // ─── Encrypt ──────────────────────────────────────────────────────────────────

  /**
   * Criptografa um token OAuth.
   * Se TOKEN_ENCRYPTION_KEY não estiver configurada, retorna o texto puro sem modificação.
   */
  encrypt(plaintext: string): string {
    if (!this.key) return plaintext;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv) as crypto.CipherGCM;

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  // ─── Decrypt ──────────────────────────────────────────────────────────────────

  /**
   * Descriptografa um token OAuth.
   *
   * Se o valor NÃO estiver no formato criptografado (token legado em texto puro),
   * retorna o valor original — garantindo compatibilidade durante migração.
   *
   * Lança erro se o valor parece criptografado mas a descriptografia falhar
   * (ex: chave errada ou dados corrompidos).
   */
  decrypt(value: string): string {
    if (!this.key || !this.isEncrypted(value)) {
      return value;
    }

    const [ivHex, authTagHex, encryptedHex] = value.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Verifica se o valor está no formato criptografado pelo `encrypt()`.
   * Tokens legados (texto puro) retornam `false`.
   */
  isEncrypted(value: string): boolean {
    return TokenCryptoService.ENC_PATTERN.test(value);
  }
}
