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
import { Throttle } from '@nestjs/throttler';
import { ResponsesService } from './responses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('responses')
@ApiBearerAuth()
@Controller('responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as respostas geradas' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.responsesService.findAll(userId, pagination);
  }

  @Get('review/:reviewId')
  @ApiOperation({ summary: 'Listar respostas de uma avaliacao' })
  findByReview(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.responsesService.findByReview(reviewId, userId);
  }

  @Post('generate/:reviewId')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Gerar resposta com IA para uma avaliacao' })
  generate(
    @Param('reviewId') reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.responsesService.generateResponse(reviewId, userId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprovar resposta gerada' })
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('publishedText') publishedText?: string,
  ) {
    return this.responsesService.approve(id, userId, publishedText);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeitar resposta gerada' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.responsesService.reject(id, userId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar resposta aprovada no Google' })
  publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.responsesService.publish(id, userId);
  }
}
