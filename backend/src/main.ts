import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('SaaS Billing Engine')
    .setDescription('API documentation for the SaaS Billing Engine')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = process.env.PORT ?? '3000';
  await app.listen(port);
  console.log(`server running on ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();
