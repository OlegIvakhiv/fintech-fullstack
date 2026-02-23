import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateTransferDto {
    @IsNumber()
    fromAccountId: number;

    @IsNumber()
    toAccountId: number;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateDepositDto {
    @IsNumber()
    accountId: number;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateInvestmentDto {
    @IsNumber()
    accountId: number;

    @IsNumber()
    businessUnitId: number;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateWithdrawDto {
    @IsNumber()
    accountId: number;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}

// Новий DTO для виводу з інвестиції
export class CreateDivestmentDto {
    @IsNumber()
    accountId: number; // Куди повернути гроші

    @IsNumber()
    businessUnitId: number; // З якого проекту забрати

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    description?: string;
}