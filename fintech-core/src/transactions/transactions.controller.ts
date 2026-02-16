import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

// Створимо просту структуру (DTO) для вхідних даних
class CreateTransferDto {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    description?: string;
}

@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post() // POST /transactions
    async transfer(@Body() body: CreateTransferDto) {
        return this.transactionsService.createTransfer(
            body.fromAccountId,
            body.toAccountId,
            body.amount,
            body.description
        );
    }

    @Get('history/:accountId')
    async getHistory(@Param('accountId') accountId: string) {
        return this.transactionsService.getAccountHistory(+accountId);
    }

    @Get('details/:transactionId')
    async getDetails(@Param('transactionId') transactionId: string) {
        return this.transactionsService.getTransactionDetails(transactionId);
    }


}