import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsEnum(Currency, {
    message: 'currency must be one of: USD, EUR, UAH',
  })
  currency: Currency;

  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @IsOptional()
  portfolioId?: number;
}