import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';

const apiRoot = resolve(__dirname, '..');
function loadEnv() {
  const tryLoad = (name: string) => {
    const p = resolve(apiRoot, name);
    if (existsSync(p)) config({ path: p, override: true });
  };
  tryLoad('.env');
  if (process.env.NODE_ENV) tryLoad(`.env.${process.env.NODE_ENV}`);
  tryLoad('.env.local');
}
loadEnv();
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`API http://localhost:${port}`);
}

bootstrap();
