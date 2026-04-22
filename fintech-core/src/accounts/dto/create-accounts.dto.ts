import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsEnum(Currency, { message: 'currency must be one of: USD, EUR, UAH' })
  currency!: Currency;

  @IsOptional()
  @Transform(({ value }) => Math.round(Number(value) * 1e8) / 1e8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  initialBalance?: number;

  @IsOptional()
  @IsNumber()
  portfolioId?: number;
}