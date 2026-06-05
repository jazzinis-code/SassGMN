import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, googleConfig, jwtConfig, openaiConfig, redisConfig } from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, googleConfig, jwtConfig, openaiConfig, redisConfig],
    }),
  ],
})
export class AppConfigModule {}
