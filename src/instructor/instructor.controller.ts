import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { InstructorService } from './instructor.service';


@Controller('instructor')
@Roles(UserRole.INSTRUCTOR)
export class InstructorController {
  constructor(
    private readonly instructorService: InstructorService,
  ) {}
