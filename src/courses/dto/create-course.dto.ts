import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsPositive,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsUUID()
  category_id: string;

  @IsInt()
  @IsPositive()
  capacity: number;
}
