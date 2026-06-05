import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Módulo global — AuditService está disponível para injeção
 * em qualquer módulo sem necessidade de importação explícita.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
