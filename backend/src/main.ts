import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { initSentry } from './common/sentry/sentry.config';
import { AppModule } from './app.module';
import { REQUIRED_ENV_VARS } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// ── Sentry deve ser inicializado antes de qualquer import NestJS ─────────────
initSentry();

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão definidas.
 * Encerra o processo com código 1 se alguma estiver ausente.
 */
function validateEnv(): void {
  const logger = new Logger('Bootstrap');
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      `Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}\n` +
        'Copie backend/.env.example para backend/.env e preencha os valores.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  // Valida env vars antes de inicializar qualquer módulo
  validateEnv();

  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Segurança ───────────────────────────────────────────────────────────────
  // Helmet: define headers HTTP de segurança (XSS, CSRF, clickjacking, etc.)
  app.use(helmet());

  // CORS: permite apenas o frontend configurado
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Performance ─────────────────────────────────────────────────────────────
  // Compressão gzip para respostas maiores que 1KB
  app.use(compression());

  // ── Validação global ────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Filtros e interceptors globais ──────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Google Reviews System API')
    .setDescription(
      'API para gerenciamento e resposta automatizada de avaliações do Google Business Profile',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação e OAuth')
    .addTag('users', 'Gerenciamento de usuários')
    .addTag('businesses', 'Gerenciamento de empresas/perfis')
    .addTag('reviews', 'Avaliações do Google')
    .addTag('responses', 'Respostas geradas por IA')
    .addTag('google', 'Integração Google Business Profile')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── Start ────────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 Servidor rodando na porta ${port}`);
  logger.log(`📚 Swagger disponível em http://localhost:${port}/api/docs`);
  logger.log(`🌍 Ambiente: ${process.env.NODE_ENV ?? 'development'}`);
}

bootstrap();
