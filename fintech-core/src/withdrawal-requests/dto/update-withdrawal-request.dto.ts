import { PartialType } from '@nestjs/mapped-types';
import { CreateWithdrawalRequestDto } from './create-withdrawal-request.dto';
import { IsInt, IsEnum } from 'class-validator';

export enum RequestAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class UpdateWithdrawalRequestDto extends PartialType(CreateWithdrawalRequestDto) {
  @IsEnum(RequestAction)
  action!: RequestAction;
}