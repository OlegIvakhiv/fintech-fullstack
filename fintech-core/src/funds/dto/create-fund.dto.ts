import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class AllocationDto {
  @IsNumber()
  businessUnitId!: number;

  @IsNumber()
  weight!: number;
}

export class CreateFundDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  currency!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationDto) // <--- THIS IS CRITICAL
  allocations!: AllocationDto[];
}