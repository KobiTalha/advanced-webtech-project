import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Browse published courses with filtering and pagination',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['newest', 'oldest', 'title'],
  })
  findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findPublishedCourses(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a published course',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findPublishedCourse(id);
  }
}