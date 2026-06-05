import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationMode } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Segmento de atuacao' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'ID do perfil do Google Business' })
  @IsOptional()
  @IsString()
  googleProfileId?: string;

  @ApiPropertyOptional({ description: 'Tom de voz para respostas' })
  @IsOptional()
  @IsString()
  toneOfVoice?: string;

  @ApiPropertyOptional({ description: 'Palavras-chave para SEO', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Servicos principais', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mainServices?: string[];

  @ApiPropertyOptional({ description: 'Numero de WhatsApp' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Mensagem padrao de resolucao' })
  @IsOptional()
  @IsString()
  defaultResolutionMessage?: string;

  @ApiPropertyOptional({ description: 'Termos a evitar nas respostas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidTerms?: string[];

  @ApiPropertyOptional({ description: 'Template de resposta personalizado' })
  @IsOptional()
  @IsString()
  responseTemplate?: string;

  @ApiPropertyOptional({
    description: 'Modo de automacao',
    enum: AutomationMode,
    default: AutomationMode.MANUAL,
  })
  @IsOptional()
  @IsEnum(AutomationMode)
  automationMode?: AutomationMode;

  @ApiPropertyOptional({ description: 'Empresa ativa', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
