import { Module } from '@nestjs/common';
import { WithdrawalRequestsService } from './withdrawal-requests.service';
import { WithdrawalRequestsController } from './withdrawal-requests.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { PrismaService } from 'src/prisma-service/prisma.service';

@Module({
  imports: [TransactionsModule],
  controllers: [WithdrawalRequestsController],
  providers: [WithdrawalRequestsService, PrismaService],
})
export class WithdrawalRequestsModule {}