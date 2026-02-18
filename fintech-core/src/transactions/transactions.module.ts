import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DepositsController, InvestmentsController, TransactionsController, WithdrawController } from './transactions.controller';
import { PrismaService } from '../prisma-service/prisma.service';

@Module({
  // We import PrismaService here to use it in TransactionsService for database operations
  controllers: [TransactionsController, InvestmentsController, DepositsController, WithdrawController],
  
  providers: [TransactionsService, PrismaService],
})
export class TransactionsModule {}