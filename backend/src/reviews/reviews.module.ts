import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsSyncProcessor } from './reviews-sync.processor';
import { ReviewsSchedulerService } from './reviews-scheduler.service';
import { BusinessesModule } from '../businesses/businesses.module';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reviews-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BusinessesModule,
    GoogleModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsSyncProcessor, ReviewsSchedulerService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
