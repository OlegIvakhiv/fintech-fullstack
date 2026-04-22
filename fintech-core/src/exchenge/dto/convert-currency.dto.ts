import { IsEnum, IsNumber, IsPositive, NotEquals } from 'class-validator';

export enum SupportedCurrency {
  USD = 'USD',
  EUR = 'EUR',
  UAH = 'UAH',
}

export class ConvertCurrencyDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  amount!: number;

  @IsEnum(SupportedCurrency, { message: 'from must be USD, EUR, or UAH' })
  from!: SupportedCurrency;

  @IsEnum(SupportedCurrency, { message: 'to must be USD, EUR, or UAH' })
  to!: SupportedCurrency;
}
