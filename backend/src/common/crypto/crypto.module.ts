import { Global, Module } from '@nestjs/common';
import { TokenCryptoService } from './token-crypto.service';

/**
 * Módulo global de criptografia.
 *
 * Disponibiliza `TokenCryptoService` em toda a aplicação sem necessidade
 * de import explícito nos módulos consumidores (semelhante ao AuditModule).
 *
 * Registrado em AppModule.
 */
@Global()
@Module({
  providers: [TokenCryptoService],
  exports: [TokenCryptoService],
})
export class CryptoModule {}
