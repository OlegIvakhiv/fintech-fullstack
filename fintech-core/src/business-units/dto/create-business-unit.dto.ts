import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateBusinessUnitDto {
  @IsString()
  name: string; // Name of the business unit

  @IsOptional()
  @IsString()
  description?: string; // Description of the business unit

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency; // Currency of the business unit

  @IsNumber()
  interestRate: number; // Interest rate of the business unit
}