import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ReviewsService } from './reviews.service';

interface SyncJobData {
  businessId: string;
  userId: string;
  googleProfileId: string;
}

@Processor('reviews-sync')
export class ReviewsSyncProcessor {
  private readonly logger = new Logger(ReviewsSyncProcessor.name);

  constructor(private readonly reviewsService: ReviewsService) {}

  @Process('sync-reviews')
  async handleSync(job: Job<SyncJobData>) {
    const { businessId, userId, googleProfileId } = job.data;

    this.logger.log(
      `Iniciando sync de avaliações — business: ${businessId}`,
    );

    await this.reviewsService.processSyncJob(businessId, userId, googleProfileId);

    this.logger.log(
      `Sync concluído — business: ${businessId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<SyncJobData>, error: Error) {
    this.logger.error(
      `Falha no sync — business: ${job.data.businessId} | tentativa: ${job.attemptsMade}`,
      error.stack,
    );
  }
}
