import { IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetMonthlyROIDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month!: number;

  @IsNumber()
  @Min(2000)
  year!: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  monthlyROI!: number;

  @Transform(({ value }) => Math.round(Number(value) * 1e8) / 1e8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  totalPoolValue!: number;
}