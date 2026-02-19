import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto, CreateInvestmentDto, CreateTransferDto, CreateWithdrawDto } from './dto/create-transactions.dto';


@Controller('transactions')
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    // admin method - get all transactions, filter by type, 
    // get history by account, get details by transaction ID
    @Get('all') // GET /transactions/all
    async getAll() {
        return this.transactionsService.findAll();
    }

    // filtre transactions by type (INVEST, DEPOSIT, TRANSFER, WITHDRAW)

    @Get('filter') // GET /transactions/filter?type=INVEST
    async getByType(@Query('type') type: string) {
        return this.transactionsService.findByType(type);
    }

    @Post('transfer') // POST /transactions/transfer
    async transfer(@Body() dto: CreateTransferDto) {
        return this.transactionsService.createTransfer(dto);
    }

    @Get('history/:accountId') // GET /transactions/history/1
    async getHistory(@Param('accountId') accountId: string) {
        return this.transactionsService.getAccountHistory(+accountId);
    }

}




@Controller('investments') 
export class InvestmentsController {
    constructor(private readonly transactionsService: TransactionsService) {}
   
    @Post() // POST /investments
    async createInvestment(@Body() dto: CreateInvestmentDto) {
        return await this.transactionsService.invest(dto);
    }
}




@Controller('deposits')
export class DepositsController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post() // POST /deposits
    async createDeposit(@Body() dto: CreateDepositDto) {
        return await this.transactionsService.deposit(dto);
    }
}



@Controller('withdraw')
export class WithdrawController {
    constructor(private readonly transactionsService: TransactionsService) {}

    @Post() // POST /withdraw
    async createWithdraw(@Body() dto: CreateWithdrawDto) {
        return await this.transactionsService.withdraw(dto);
    }
}