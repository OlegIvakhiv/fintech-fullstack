import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { CreateBusinessUnitDto } from './dto/create-business-unit.dto';
import { UpdateBusinessUnitDto } from './dto/update-business-unit.dto';

@Controller('business-units')
export class BusinessUnitsController {
  constructor(private readonly businessUnitsService: BusinessUnitsService) {}

  @Post() // POST /business-units
  create(@Body() createBusinessUnitDto: CreateBusinessUnitDto) {
    return this.businessUnitsService.create(createBusinessUnitDto);
  }

  @Get() // GET /business-units
  findAll() {
    return this.businessUnitsService.findAll();
  }

  @Get(':id') // GET /business-units/1
  findOne(@Param('id') id: string) {
    return this.businessUnitsService.findOne(+id);
  }

  @Patch(':id') // PATCH /business-units/1
  update(@Param('id') id: string, @Body() updateBusinessUnitDto: UpdateBusinessUnitDto) {
    return this.businessUnitsService.update(+id, updateBusinessUnitDto);
  }

  @Delete(':id') // DELETE /business-units/1
  remove(@Param('id') id: string) {
    return this.businessUnitsService.remove(+id);
  }
}
