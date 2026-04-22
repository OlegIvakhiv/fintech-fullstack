import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { SetMonthlyROIDto } from './dto/set-monthly-roi.dto';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client/index-browser';
import { Roles } from 'src/auth/decorator/roles.decorator';

// Controller for managing business units - creating, listing, and ROI management
@Controller('business-units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) { }

  // ✅ POST /business-units - Create new business unit (ADMIN only)
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createBusinessUnitDto: CreateBusinessUnitDto) {
    return this.businessUnitsService.create(createBusinessUnitDto);
  }

  // ✅ GET /business-units - List all active business units
  @Get()
  @Roles(Role.ADMIN, Role.INVESTOR)
  findAll() {
    return this.businessUnitsService.findAll();
  }

  // ✅ GET /business-units/:id/roi-history - Get ROI history (must come before /:id)
  @Get(':id/roi-history')
  @Roles(Role.ADMIN, Role.INVESTOR)
  getROIHistory(@Param('id') id: string, @Query('year') year?: string) {
    return this.businessUnitsService.getROIHistory(+id, year ? +year : undefined);
  }

  // ✅ GET /business-units/:id/roi-current - Get current month's ROI (must come before /:id)
  @Get(':id/roi-current')
  @Roles(Role.ADMIN, Role.INVESTOR)
  getCurrentMonthROI(@Param('id') id: string) {
    return this.businessUnitsService.getCurrentMonthROI(+id);
  }

  // ✅ GET /business-units/:id/current-month-projection/:amount (must come before /:id)
  @Get(':id/current-month-projection/:amount')
  async getCurrentMonthProjection(
    @Param('id') id: string,
    @Param('amount') amount: string,
  ) {
    return this.businessUnitsService.getCurrentMonthProjection(
      +id,
      parseFloat(amount),
    );
  }

  // ✅ GET /business-units/:buId/investor-earnings/:investmentAmount (must come before /:id)
  @Get(':buId/investor-earnings/:investmentAmount')
  @Roles(Role.ADMIN, Role.INVESTOR)
  calculateInvestorEarnings(
    @Param('buId') buId: string,
    @Param('investmentAmount') investmentAmount: string,
  ) {
    return this.businessUnitsService.calculateInvestorEarnings(
      +buId,
      +investmentAmount,
      +buId,
    );
  }

  // ✅ GET /business-units/:id - Get details of specific business unit (LAST GET!)
  @Get(':id')
  @Roles(Role.ADMIN, Role.INVESTOR)
  findOne(@Param('id') id: string) {
    return this.businessUnitsService.findOne(+id);
  }

  // ✅ POST /business-units/:id/roi - Set/Create monthly ROI (ADMIN only)
  @Post(':id/roi')
  @Roles(Role.ADMIN)
  setMonthlyROI(@Param('id') id: string, @Body() dto: SetMonthlyROIDto) {
    return this.businessUnitsService.setMonthlyROI(+id, dto);
  }

  // ✅ NEW: DELETE /business-units/:id/roi/:roiId - Delete specific ROI record
  @Delete(':id/roi/:roiId')
  @Roles(Role.ADMIN)
  deleteROI(@Param('id') id: string, @Param('roiId') roiId: string) {
    return this.businessUnitsService.deleteROI(+id, +roiId);
  }

  // ✅ PATCH /business-units/:id - Update business unit info (ADMIN only)
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateBusinessUnitDto: UpdateBusinessUnitDto) {
    return this.businessUnitsService.update(+id, updateBusinessUnitDto);
  }

  // ✅ DELETE /business-units/:id - Soft delete business unit (ADMIN only)
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.businessUnitsService.remove(+id);
  }
}