import { Controller, Post, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolios.dto';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) { }

  // create a new portfolio for a user

  @Post() // POST /portfolios
  create(@Body() body: CreatePortfolioDto) {
    return this.portfoliosService.create(body);
  }
  @Get() // GET /portfolios
  findAll() {
    return this.portfoliosService.findAll();
  }
  @Get(':id') // GET /portfolios/1
  findOne(@Param('id') id: string) {
    return this.portfoliosService.findOne(+id);
  }

  @Patch(':id') // PATCH /portfolios/1
  update(@Body() body: CreatePortfolioDto, @Param('id') id: string) {
    return this.portfoliosService.patch(+id, body);
  }

  @Delete(':id') // DELETE /portfolios/1
  remove(@Param('id') id: string) {
    return this.portfoliosService.remove(+id);
  }
}  