import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TeachingAssistantModule } from './teaching-assistant/teaching-assistant.module';

@Module({
  imports: [TeachingAssistantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
