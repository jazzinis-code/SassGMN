import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, googleConfig, jwtConfig, openaiConfig, redisConfig, cryptoConfig } from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, googleConfig, jwtConfig, openaiConfig, redisConfig, cryptoConfig],
    }),
  ],
})
export class AppConfigModule {}
