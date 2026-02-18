import { Controller, Post, Get, Body, Patch, Param } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) { }

  // create a new portfolio for a user

  @Post() // POST /portfolios
  create(@Body() body: { name: string; userId: number }) {
    return this.portfoliosService.create(body);
  }
  @Get() // GET /portfolios
  findAll() {
    return this.portfoliosService.findAll();
  }

  @Patch(':id') // PATCH /portfolios/1
  update(@Body() body: { name?: string }, @Param('id') id: string) {
    return this.portfoliosService.patch(+id, body);
  }
}  