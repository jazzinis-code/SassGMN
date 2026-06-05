import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Serviço de agendamento de sincronização automática de avaliações.
 *
 * Roda a cada 6 horas e enfileira jobs de sync para todos os negócios ativos
 * que possuem um googleProfileId vinculado.
 *
 * O processamento real é feito pelo ReviewsSyncProcessor via fila Bull,
 * garantindo retries automáticos e isolamento de falhas por negócio.
 */
@Injectable()
export class ReviewsSchedulerService {
  private readonly logger = new Logger(ReviewsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reviews-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * Executa a cada 6 horas: 00:00, 06:00, 12:00, 18:00.
   * Pode ser ajustado pela variável REVIEWS_SYNC_CRON no .env.
   */
  @Cron(process.env.REVIEWS_SYNC_CRON ?? '0 0,6,12,18 * * *', {
    name: 'reviews-auto-sync',
    timeZone: 'America/Sao_Paulo',
  })
  async syncAllActiveBusinesses(): Promise<void> {
    this.logger.log('⏰ CRON: iniciando sincronização automática de avaliações');

    // Busca todos os negócios ativos com perfil Google vinculado
    const businesses = await this.prisma.business.findMany({
      where: {
        isActive: true,
        googleProfileId: { not: null },
      },
      select: {
        id: true,
        name: true,
        googleProfileId: true,
        userId: true,
      },
    });

    if (businesses.length === 0) {
      this.logger.log('CRON: nenhum negócio ativo com Google Profile encontrado');
      return;
    }

    this.logger.log(`CRON: enfileirando sync para ${businesses.length} negócio(s)`);

    let enqueued = 0;
    let skipped = 0;

    for (const business of businesses) {
      // Verificar se já existe um job pendente para este negócio
      // evita enfileirar duplicatas caso o CRON rode antes do job anterior terminar
      const waitingJobs = await this.syncQueue.getWaiting();
      const alreadyQueued = waitingJobs.some(
        (job) => job.data.businessId === business.id,
      );

      if (alreadyQueued) {
        this.logger.debug(`CRON: sync para "${business.name}" já está na fila — ignorando`);
        skipped++;
        continue;
      }

      await this.syncQueue.add('sync-reviews', {
        businessId: business.id,
        userId: business.userId,
        googleProfileId: business.googleProfileId,
      });

      enqueued++;
      this.logger.debug(`CRON: sync enfileirado para "${business.name}" (${business.id})`);
    }

    this.logger.log(
      `CRON: concluído — ${enqueued} enfileirado(s), ${skipped} já estavam na fila`,
    );
  }
}
