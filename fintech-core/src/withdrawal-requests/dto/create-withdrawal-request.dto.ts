import { IsInt, IsPositive, IsNumber, IsOptional, IsString, IsEnum, ValidateIf } from 'class-validator';
import { WithdrawalType, WithdrawalMethod } from '@prisma/client';

// CreateWithdrawalRequestDto
export class CreateWithdrawalRequestDto {
  @IsInt()
  accountId: number;

  // Type field (required) - determines which withdrawal flow
  @IsEnum(WithdrawalType)
  withdrawalType: WithdrawalType;

  @IsNumber()
  @IsPositive()
  amount: number;

  // Type 1: BUSINESS_UNIT_TO_ACCOUNT
  // Required only for Type 1 & 2
  @ValidateIf(dto => 
    dto.withdrawalType === 'BUSINESS_UNIT_TO_ACCOUNT' || 
    dto.withdrawalType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT'
  )
  @IsInt()
  fromBusinessUnitId?: number;

  // Type 2: BUSINESS_UNIT_TO_BUSINESS_UNIT
  // Required only for Type 2
  @ValidateIf(dto => dto.withdrawalType === 'BUSINESS_UNIT_TO_BUSINESS_UNIT')
  @IsInt()
  toBusinessUnitId?: number;

  // Type 3: ACCOUNT_TO_EXTERNAL
  // Required only for Type 3
  @ValidateIf(dto => dto.withdrawalType === 'ACCOUNT_TO_EXTERNAL')
  @IsString()
  externalWallet?: string;

  // Type 3: ACCOUNT_TO_EXTERNAL
  // Required only for Type 3
  @ValidateIf(dto => dto.withdrawalType === 'ACCOUNT_TO_EXTERNAL')
  @IsEnum(WithdrawalMethod)
  withdrawalMethod?: WithdrawalMethod;

  @IsOptional()
  @IsString()
  description?: string;
}