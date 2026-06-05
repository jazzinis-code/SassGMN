import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoogleService } from './google.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('google')
@ApiBearerAuth()
@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'Listar perfis do Google Business vinculados' })
  listProfiles(@CurrentUser('id') userId: string) {
    return this.googleService.listBusinessProfiles(userId);
  }
}
