import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ReviewsService } from './reviews.service';

interface SyncJobData {
  businessId: string;
  userId: string;
  googleProfileId: string;
}

@Processor('reviews-sync')
export class ReviewsSyncProcessor {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Process('sync-reviews')
  async handleSync(job: Job<SyncJobData>) {
    const { businessId, userId, googleProfileId } = job.data;
    await this.reviewsService.processSyncJob(businessId, userId, googleProfileId);
  }
}
