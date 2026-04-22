import { IsInt, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class InvestInFundDto {
  @IsInt()
  fundId!: number;

  @IsInt()
  accountId!: number;

  @Transform(({ value }) => Math.round(Number(value) * 1e8) / 1e8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;
}