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

    @Get('history/:accountId') // GET /transactions/history/:accountId
    async getHistory(@Param('accountId') accountId: string) {
        return this.transactionsService.getAccountHistory(+accountId);
    }

    @Get('details/:transactionId') // GET /transactions/details/:transactionId
    async getDetails(@Param('transactionId') transactionId: string) {
        return this.transactionsService.getTransactionDetails(transactionId);
    }


}

@Controller('investments')
export class InvestmentsController {
    constructor(private readonly transactionsService: TransactionsService) {}
   
    @Post()
    async createInvestment(@Body() data: { accountId: number; businessUnitId: number; amount: number; description?: string }) {
        return await this.transactionsService.invest(
            data.accountId, 
            data.businessUnitId, 
            data.amount, 
            data.description
        );
    }
}

@Controller('deposits')
export class DepositsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post()
    async createDeposit(@Body() data: { accountId: number; amount: number; description?: string }) {
        return await this.transactionsService.deposit(
            data.accountId, 
            data.amount, 
            data.description
        );
    }
}

@Controller ('withdraw')
export class WithdrawController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post()
    async createWithdraw(@Body() data: { accountId: number; amount: number; description?: string }) {
        return await this.transactionsService.withdraw(
            data.accountId, 
            data.amount, 
            data.description
        );
    }
}