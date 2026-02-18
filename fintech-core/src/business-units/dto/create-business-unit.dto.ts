import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateBusinessUnitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsNumber()
  interestRate: number;
}