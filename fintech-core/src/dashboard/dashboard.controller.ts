import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guards';
import { Roles } from '../auth/decorator/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardService, InvestorDashboardStats, AdminDashboardStats } from './dashboard.service';

// This controller handles dashboard endpoints
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) { }

  // Get investor dashboard stats
  @Get('investor-stats')
  @Roles(Role.INVESTOR, Role.ADMIN)
  async getInvestorStats(@Req() req): Promise<InvestorDashboardStats> {
    const userId = req.user.userId;
    return this.dashboardService.getInvestorStats(userId);
  }

  // Get admin dashboard stats
  @Get('admin-stats')
  @Roles(Role.ADMIN)
  async getAdminStats(@Req() req): Promise<AdminDashboardStats> {
    return this.dashboardService.getAdminStats();
  }

  @Get('investor-monthly-earnings')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.INVESTOR)
  async getInvestorMonthlyEarnings(@Req() req) {
    return this.dashboardService.getInvestorMonthlyEarnings(req.user.userId);
  }

}