import {
  IsString,
  IsNotEmpty,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  submission_url: string;
}