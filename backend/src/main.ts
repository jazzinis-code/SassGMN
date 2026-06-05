import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

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

  const config = new DocumentBuilder()
    .setTitle('Google Reviews System API')
    .setDescription('API para gerenciamento e resposta automatizada de avaliacoes do Google')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticacao e OAuth')
    .addTag('users', 'Gerenciamento de usuarios')
    .addTag('businesses', 'Gerenciamento de empresas/perfis')
    .addTag('reviews', 'Avaliacoes do Google')
    .addTag('responses', 'Respostas geradas por IA')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`Application running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
