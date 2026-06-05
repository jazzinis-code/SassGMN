import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsSyncProcessor } from './reviews-sync.processor';
import { BusinessesModule } from '../businesses/businesses.module';
import { GoogleModule } from '../google/google.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reviews-sync',
    }),
    BusinessesModule,
    GoogleModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsSyncProcessor],
  exports: [ReviewsService],
})
export class ReviewsModule {}
