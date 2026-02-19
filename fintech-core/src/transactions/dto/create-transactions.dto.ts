import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

// DTO for creating a transfer transaction
export class CreateTransferDto {
    @IsNumber()
    fromAccountId: number; // Changed from accountId to fromAccountId for clarity

    @IsNumber()
    toAccountId: number; // Added toAccountId for transfer destination

    @IsNumber()
    @Min(0.01)
    amount: number; // Added validation to ensure amount is positive

    @IsOptional()
    @IsString()
    description?: string; // Optional description for the transfer
}

// DTO for creating a deposit transaction
export class CreateDepositDto {
    @IsNumber()
    accountId: number; // Account to which the deposit will be made

    @IsNumber()
    @Min(0.01)
    amount: number; // Added validation to ensure amount is positive
    
    @IsOptional()
    @IsString()
    description?: string; // Optional description for the deposit
}

// DTO for creating an investment transaction
export class CreateInvestmentDto {
    @IsNumber()
    accountId: number; // Account from which the investment will be made

    @IsNumber()
    businessUnitId: number; // Business unit in which the investment will be made

    @IsNumber()
    @Min(0.01)
    amount: number; // Added validation to ensure amount is positive

    @IsOptional()
    @IsString()
    description?: string; // Optional description for the investment
}

// DTO for creating a withdraw transaction
export class CreateWithdrawDto {
    @IsNumber()
    accountId: number;  // Account from which the withdrawal will be made

    @IsNumber()
    @Min(0.01)
    amount: number;  // Added validation to ensure amount is positive

    @IsOptional()
    @IsString()
    description?: string; // Optional description for the withdrawal
}

