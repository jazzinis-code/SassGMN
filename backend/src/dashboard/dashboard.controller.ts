import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Métricas gerais do dashboard' })
  getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStats(userId);
  }

  @Get('chart-data')
  @ApiOperation({ summary: 'Dados de série temporal para gráficos' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Janela em dias (padrão: 30)' })
  getChartData(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    return this.dashboardService.getChartData(userId, days ? Number(days) : 30);
  }
}
