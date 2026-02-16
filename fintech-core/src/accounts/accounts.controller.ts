import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';

// This controller manages accounts - creating new accounts and listing accounts by portfolio. It uses AccountsService for business logic and database operations.

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  // Create a new account with specified name, type, portfolio ID, and optional initial balance. The request body should contain these details.

  @Post() // POST /accounts
  create(@Body() body: { name: string; type: string; portfolioId: number; initialBalance?: number }) {
    return this.accountsService.create(body);
  }

  // Get all accounts that belong to a specific portfolio. The portfolio ID is provided as a URL parameter.

  @Get('portfolio/:id') // GET /accounts/portfolio/1
  findAll(@Param('id') id: string) {
    return this.accountsService.findByPortfolio(+id);
  }
}