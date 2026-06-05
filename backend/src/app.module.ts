import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ResponsesModule } from './responses/responses.module';
import { AiModule } from './ai/ai.module';
import { GoogleModule } from './google/google.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    // Rate limiting global: 100 req / 60s por IP
    // Endpoints sensíveis (ex: /responses/generate) herdam este limite.
    // Para limites específicos por rota, use @Throttle({ default: { limit, ttl } }).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,   // janela de 60 segundos
        limit: 100,    // máx 100 requisições por IP por janela
      },
    ]),
    AppConfigModule,
    PrismaModule,
    AuditModule,   // global — disponível em todos os módulos
    AuthModule,
    UsersModule,
    BusinessesModule,
    ReviewsModule,
    ResponsesModule,
    AiModule,
    GoogleModule,
    DashboardModule,
  ],
  providers: [
    // Aplica ThrottlerGuard globalmente em todas as rotas
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
