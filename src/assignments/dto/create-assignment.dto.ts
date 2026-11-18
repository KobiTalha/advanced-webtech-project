import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  instructions: string;

  @IsDateString()
  deadline: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  max_marks: number;
}