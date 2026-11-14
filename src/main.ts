import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import {
  SwaggerModule,
  DocumentBuilder,
} from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix.
  app.setGlobalPrefix('api');

  // Global validation.
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

  app.enableCors();

  // Swagger configuration.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduSphere API')
    .setDescription(
      `
      EduSphere is an advanced online learning platform.

      Features:
      - Authentication and authorization
      - User management
      - Course and lesson management
      - Student enrollment
      - Assignment management
      - Submission and grading
      - Notifications
      - Audit logs

      Authentication uses JWT Bearer tokens.
      `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup(
    'docs',
    app,
    document,
    {
      useGlobalPrefix: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    },
  );

  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(
    `EduSphere running at http://localhost:${port}/api`,
  );

  console.log(
    `Swagger documentation: http://localhost:${port}/api/docs`,
  );
}

bootstrap();