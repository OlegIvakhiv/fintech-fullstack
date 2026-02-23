import { Controller, Post, Get, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-accounts.dto';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client/index-browser';
import { Roles } from 'src/auth/decorator/roles.decorator';

// This controller manages accounts - creating new accounts and listing accounts by portfolio. It uses AccountsService for business logic and database operations.

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) { }

  // Create a new account with specified name, type, portfolio ID, and optional initial balance. The request body should contain these details.

  @Post() // POST /accounts
  @Roles(Role.ADMIN, Role.INVESTOR)
  create(@Body() body: CreateAccountDto) {
    return this.accountsService.create(body);
  }

  @Get() // GET /accounts
  @Roles(Role.ADMIN)
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id') // GET /accounts/1
  @Roles(Role.ADMIN, Role.INVESTOR)
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(+id);
  }

  // Get all accounts that belong to a specific portfolio. The portfolio ID is provided as a URL parameter.
  @Get('portfolio/:id') // GET /accounts/portfolio/1
  @Roles(Role.ADMIN)
  findByPortfolio(@Param('id') id: string) {
    return this.accountsService.findByPortfolio(+id);
  }

  @Patch(':id') // PATCH /accounts/1
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: CreateAccountDto) {
    return this.accountsService.update(+id, body);
  }

  @Delete(':id') // DELETE /accounts/1
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.accountsService.remove(+id);
  }
}