import { Module } from '@nestjs/common';
import { FundsService } from './funds.service';
import { FundsController } from './funds.controller';
import { TransactionsModule } from 'src/transactions/transactions.module';

@Module({
  imports: [TransactionsModule],   // gives access to TransactionsService._investTx
  controllers: [FundsController],
  providers: [FundsService],
})
export class FundsModule {}