import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsString()
  type: string; // can be 'checking', 'savings', 'investment', etc.

  @IsNumber()
  portfolioId: number;

  @IsOptional()
  @IsNumber()
  initialBalance?: number;
}