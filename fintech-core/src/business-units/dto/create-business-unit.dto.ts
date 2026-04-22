import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateBusinessUnitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  currency: string; // USD, EUR, UAH

  @IsOptional()
  @IsNumber()
  monthlyROI?: number; // Initial monthly ROI percentage

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number; // Optional month for initial ROI (defaults to current)

  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2099)
  year?: number; // Optional year for initial ROI (defaults to current)

  @IsOptional()
  @IsNumber()
  totalPoolValue?: number; // Optional initial pool value (defaults to 0)

  @IsOptional()
  @IsNumber()
  interestRate?: number; // Deprecated but kept for compatibility
}