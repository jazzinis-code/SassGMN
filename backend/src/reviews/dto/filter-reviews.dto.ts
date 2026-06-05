import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewResponseStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterReviewsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por nota minima', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Filtrar por nota maxima', minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({ description: 'Filtrar por status da resposta', enum: ReviewResponseStatus })
  @IsOptional()
  @IsEnum(ReviewResponseStatus)
  responseStatus?: ReviewResponseStatus;

  @ApiPropertyOptional({ description: 'Buscar por nome do avaliador' })
  @IsOptional()
  @IsString()
  reviewerName?: string;

  @ApiPropertyOptional({ description: 'ID da empresa' })
  @IsOptional()
  @IsString()
  businessId?: string;
}
