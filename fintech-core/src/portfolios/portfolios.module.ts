import { Module } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosController } from './portfolios.controller';

// This module manages portfolios - creating, listing, etc. 
// It uses PrismaService for database operations and has a controller to handle HTTP requests.
@Module({
  providers: [PortfoliosService],
  controllers: [PortfoliosController]
})
export class PortfoliosModule {}
