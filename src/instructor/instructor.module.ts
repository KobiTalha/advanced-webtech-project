import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';



@Module({
  imports: [
    TypeOrmModule.forFeature([
  
      
    ]),
  ],

  controllers: [InstructorController],
  providers: [InstructorService],
  exports: [InstructorService],
})
export class InstructorModule {}
