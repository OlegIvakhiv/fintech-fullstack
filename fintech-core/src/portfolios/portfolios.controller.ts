import { Controller, Post, Get, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// This controller handles portfolio endpoints
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

  @Get('me') // GET /portfolios/me
  @UseGuards(JwtAuthGuard)
  async getMyPortfolio(@Req() req) {
    const userId = req.user.userId; 
    return this.portfoliosService.findByUser(userId);
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
