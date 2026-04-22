import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, UseGuards,
} from '@nestjs/common';
import { FundsService } from './funds.service';
import { CreateFundDto } from './dto/create-fund.dto';
import { InvestInFundDto } from './dto/invest-in-fund.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Role } from '@prisma/client';

@Controller('funds')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateFundDto) {
    return this.fundsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.INVESTOR)
  findAll() {
    return this.fundsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INVESTOR)
  findOne(@Param('id') id: string) {
    return this.fundsService.findOne(+id);
  }

  @Post('invest')
  @Roles(Role.INVESTOR, Role.ADMIN)
  investInFund(@Req() req, @Body() dto: InvestInFundDto) {
    return this.fundsService.investInFund(dto, req.user.userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: Partial<CreateFundDto>) {
    return this.fundsService.update(+id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.fundsService.remove(+id);
  }
}
