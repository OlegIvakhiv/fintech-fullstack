import { Controller, Post, Body, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateDepositDto, CreateDivestmentDto, CreateInvestmentDto, CreateTransferDto, CreateWithdrawDto } from './dto/create-transactions.dto';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';


@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    // admin method - get all transactions, filter by type, 
    // get history by account, get details by transaction ID
    @Get('all') // GET /transactions/all
    @Roles(Role.ADMIN)
    async getAll() {
        return this.transactionsService.findAll();
    }

    // filtre transactions by type (INVEST, DEPOSIT, TRANSFER, WITHDRAW)

    @Get('filter') // GET /transactions/filter?type=INVEST
    @Roles(Role.ADMIN)
    async getByType(@Query('type') type: string) {
        return this.transactionsService.findByType(type);
    }

    @Post('transfer') // POST /transactions/transfer
    @Roles(Role.ADMIN, Role.INVESTOR)
    async transfer(@Body() dto: CreateTransferDto) {
        return this.transactionsService.createTransfer(dto);
    }

    @Get('history/:accountId') // GET /transactions/history/1
    @Roles(Role.ADMIN)
    async getHistory(@Param('accountId') accountId: string) {
        return this.transactionsService.getAccountHistory(+accountId);
    }

    @Get('me')
    @Roles(Role.INVESTOR, Role.ADMIN)   // both roles can access, but the logic returns only the caller's transactions
    async getMyTransactions(@Req() req) {
        // req.user comes from JwtAuthGuard (set by JwtStrategy)
        const userId = req.user.userId;   // or req.user.sub, depending on your JwtStrategy
        return this.transactionsService.findByUserId(userId);
    }

    @Post('cross-currency-transfer')
    @Roles(Role.INVESTOR, Role.ADMIN)
    async crossCurrencyTransfer(@Req() req, @Body() body: { fromAccountId: number; toAccountId: number; amount: number }) {
        const userId = req.user.userId;
        return this.transactionsService.createCrossCurrencyTransfer(
            userId,
            body.fromAccountId,
            body.toAccountId,
            body.amount,
        );
    }
}



// invest - moving money from the account to the business unit
@Controller('investments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestmentsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post() // POST /investments
    @Roles(Role.ADMIN, Role.INVESTOR)
    async createInvestment(@Body() dto: CreateInvestmentDto) {
        return await this.transactionsService.invest(dto);
    }
}





// deposit - adding money to the account
@Controller('deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post() // POST /deposits
    @Roles(Role.ADMIN)
    async createDeposit(@Body() dto: CreateDepositDto) {
        return await this.transactionsService.deposit(dto);
    }
}


// withdraw - taking money out of the account
@Controller('withdraw')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post() // POST /withdraw
    @Roles(Role.ADMIN)
    async createWithdraw(@Body() dto: CreateWithdrawDto) {
        return await this.transactionsService.withdraw(dto);
    }
}

// divest - moving money from the business unit back to the account
@Controller('divestments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DivestmentsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post() // POST /divestments
    @Roles(Role.ADMIN)
    async createDivestment(@Body() dto: CreateDivestmentDto) {
        return await this.transactionsService.divest(dto);
    }


}




