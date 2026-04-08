import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DepositsController, InvestmentsController, TransactionsController, WithdrawController } from './transactions.controller';

@Module({
  // We import PrismaService here to use it in TransactionsService for database operations
  controllers: [TransactionsController, 
    InvestmentsController, 
    DepositsController, 
    WithdrawController
  ],
  exports: [TransactionsService],
  providers: [TransactionsService],
})
export class TransactionsModule {}