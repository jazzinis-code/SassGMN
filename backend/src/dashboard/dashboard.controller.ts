import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Métricas reais do dashboard',
    description:
      'Retorna totais, médias e distribuições calculados diretamente no banco. ' +
      'Todas as queries rodam em paralelo para mínima latência.',
  })
  getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStats(userId);
  }
}
