import { IsNumber, IsString } from "class-validator";

export class CreatePortfolioDto {
  @IsString()
  name: string;

  @IsNumber()
  userId: number;
}