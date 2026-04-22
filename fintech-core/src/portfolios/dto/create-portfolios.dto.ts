import { IsNumber, IsString } from "class-validator";

export class CreatePortfolioDto {
  @IsString()
  name!: string; // Portfolio name

  @IsNumber()
  userId!: number; // User ID
}