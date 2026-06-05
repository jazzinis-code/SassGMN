import { Controller, Get, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuário' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, updateDto);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Histórico de ações do usuário autenticado' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Máx de registros (padrão: 50)' })
  async getAuditLog(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByUser(userId, limit ? Number(limit) : 50);
  }
}
