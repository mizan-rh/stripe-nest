import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });

  app.enableCors({
    origin: ['https://localhost:5173', 'https://stripe-test-nest.netlify.app', 'https://localhost:5174'],
    credentials: true,
  });
  app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
