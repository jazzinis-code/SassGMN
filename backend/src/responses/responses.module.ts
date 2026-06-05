import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ResponsesService } from './responses.service';
import { ResponsesController } from './responses.controller';
import { AiModule } from '../ai/ai.module';
import { GoogleModule } from '../google/google.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'responses',
    }),
    AiModule,
    GoogleModule,
    BusinessesModule,
    ReviewsModule,
  ],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
