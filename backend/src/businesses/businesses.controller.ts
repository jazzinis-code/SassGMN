import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { GoogleService } from '../google/google.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { AuditService, AuditAction } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly businessesService: BusinessesService,
    private readonly googleService: GoogleService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova empresa' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas do usuário' })
  findAll(@CurrentUser('id') userId: string, @Query() pagination: PaginationDto) {
    return this.businessesService.findAllByUser(userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter empresa por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.businessesService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover empresa' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.businessesService.remove(id, userId);
  }

  /**
   * Vincula um perfil do Google Business Profile a esta empresa.
   * Recebe o googleProfileId (path "accounts/X/locations/Y") selecionado
   * pelo usuário na tela guiada do frontend.
   */
  @Post(':id/connect-google')
  @ApiOperation({ summary: 'Vincular perfil Google Business a uma empresa' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['googleProfileId'],
      properties: {
        googleProfileId: {
          type: 'string',
          example: 'accounts/123456789/locations/987654321',
        },
      },
    },
  })
  async connectGoogle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('googleProfileId') googleProfileId: string,
  ) {
    const business = await this.businessesService.update(id, userId, {
      googleProfileId,
    });

    await this.audit.log(userId, AuditAction.GOOGLE_PROFILE_CONNECTED, {
      businessId: id,
      googleProfileId,
    });

    return business;
  }
}
