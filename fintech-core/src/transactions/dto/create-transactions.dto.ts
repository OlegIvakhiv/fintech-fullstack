import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

const toDecimal8 = ({ value }: { value: any }) =>
  Math.round(Number(value) * 1e8) / 1e8;

export class CreateTransferDto {
  @IsNumber()
  fromAccountId!: number;

  @IsNumber()
  toAccountId!: number;

  @Transform(toDecimal8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateDepositDto {
  @IsNumber()
  accountId!: number;

  @Transform(toDecimal8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateInvestmentDto {
  @IsNumber()
  accountId!: number;

  @IsNumber()
  businessUnitId!: number;

  @Transform(toDecimal8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateWithdrawDto {
  @IsNumber()
  accountId!: number;

  @Transform(toDecimal8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateDivestmentDto {
  @IsNumber()
  accountId!: number;

  @IsNumber()
  businessUnitId!: number;

  @Transform(toDecimal8)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;
}