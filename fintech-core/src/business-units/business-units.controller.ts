import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client/index-browser';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('business-units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Post() // POST /business-units
  @Roles(Role.ADMIN)
  create(@Body() createBusinessUnitDto: CreateBusinessUnitDto) {
    return this.businessUnitsService.create(createBusinessUnitDto);
  }

  @Get() // GET /business-units
  @Roles(Role.ADMIN, Role.INVESTOR)
  findAll() {
    return this.businessUnitsService.findAll();
  }

  @Get(':id') // GET /business-units/1
  @Roles(Role.ADMIN, Role.INVESTOR)
  findOne(@Param('id') id: string) {
    return this.businessUnitsService.findOne(+id);
  }

  @Patch(':id') // PATCH /business-units/1
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateBusinessUnitDto: UpdateBusinessUnitDto) {
    return this.businessUnitsService.update(+id, updateBusinessUnitDto);
  }

  @Delete(':id') // DELETE /business-units/1
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.businessUnitsService.remove(+id);
  }
}
