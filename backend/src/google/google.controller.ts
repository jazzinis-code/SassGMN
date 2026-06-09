import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoogleService } from './google.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('google')
@ApiBearerAuth()
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Get('token-status')
  @ApiOperation({ summary: 'Verificar status do token Google do usuário' })
  getTokenStatus(@CurrentUser('id') userId: string) {
    return this.googleService.getTokenStatus(userId);
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Listar perfis do Google Business vinculados' })
  async listProfiles(@CurrentUser('id') userId: string) {
    try {
      return await this.googleService.listBusinessProfiles(userId);
    } catch (error: any) {
      if (error?.googleApiError) {
        throw new HttpException(
          {
            statusCode: error.statusCode,
            message: error.message,
            type: error.isQuotaError ? 'QUOTA_EXCEEDED' : 'GOOGLE_API_ERROR',
          },
          error.statusCode,
        );
      }
      throw error;
    }
  }
}
