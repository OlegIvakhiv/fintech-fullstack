import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

export class UpdateBusinessUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  monthlyROI?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}