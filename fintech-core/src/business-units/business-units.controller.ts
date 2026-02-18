import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';

@Controller('business-units')
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Post()
  create(@Body() createBusinessUnitDto: CreateBusinessUnitDto) {
    return this.businessUnitsService.create(createBusinessUnitDto);
  }

  @Get()
  findAll() {
    return this.businessUnitsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessUnitsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBusinessUnitDto: UpdateBusinessUnitDto) {
    return this.businessUnitsService.update(+id, updateBusinessUnitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.businessUnitsService.remove(+id);
  }
}
