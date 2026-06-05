import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { FilterReviewsDto } from './dto/filter-reviews.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar avaliacoes com filtros' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() filters: FilterReviewsDto,
  ) {
    return this.reviewsService.findAll(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter avaliacao por ID' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.findById(id, userId);
  }

  @Post('sync/:businessId')
  @ApiOperation({ summary: 'Sincronizar avaliacoes do Google para uma empresa' })
  syncReviews(
    @Param('businessId') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.syncFromGoogle(businessId, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da avaliacao' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('status') status: string,
  ) {
    return this.reviewsService.updateStatus(id, userId, status);
  }
}
