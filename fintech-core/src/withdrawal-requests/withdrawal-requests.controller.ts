import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WithdrawalRequestsService } from './withdrawal-requests.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { RequestAction, UpdateWithdrawalRequestDto } from './dto/update-withdrawal-request.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@Controller('withdrawal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WithdrawalRequestsController {
  constructor(private readonly service: WithdrawalRequestsService) { }

  // Investor creates a withdrawal request
  // Now supports all 3 withdrawal types
  // Body: {
  //   accountId: number,
  //   withdrawalType: 'BUSINESS_UNIT_TO_ACCOUNT' | 'BUSINESS_UNIT_TO_BUSINESS_UNIT' | 'ACCOUNT_TO_EXTERNAL',
  //   amount: number,
  //   fromBusinessUnitId?: number (for Type 1 & 2),
  //   toBusinessUnitId?: number (for Type 2),
  //   externalWallet?: string (for Type 3),
  //   withdrawalMethod?: 'CRYPTO' | 'BANK_TRANSFER' | 'CASH' (for Type 3),
  //   description?: string
  // }

  // POST /withdrawal-requests
  @Post()
  @Roles(Role.INVESTOR)
  async create(@Req() req, @Body() dto: CreateWithdrawalRequestDto) {
    return this.service.create(req.user.userId, dto);
  }

  // GET /withdrawal-requests/my
  @Get('my')
  @Roles(Role.INVESTOR)
  async getMyRequests(@Req() req) {
    return this.service.findMyRequests(req.user.userId);
  }

  // GET /withdrawal-requests/pending
  // Returns all pending requests with full details
  @Get('pending')
  @Roles(Role.ADMIN)
  async getPending() {
    return this.service.findPending();
  }

  // PATCH /withdrawal-requests/:id/process
  // Body: { action: 'APPROVE' | 'REJECT' }
  @Patch(':id/process')
  @Roles(Role.ADMIN)
  async process(
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalRequestDto,
    @Req() req,
  ) {
    const requestId = +id;
    if (dto.action === RequestAction.APPROVE) {
      return this.service.approve(requestId, req.user.userId);
    } else {
      return this.service.reject(requestId, req.user.userId);
    }
  }
}