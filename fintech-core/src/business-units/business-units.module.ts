import { Module } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { BusinessUnitsController } from './business-units.controller';

// This module manages business units - creating, listing, etc. 
// It uses PrismaService for database operations and has a controller to handle HTTP requests.
@Module({
  controllers: [BusinessUnitsController],
  providers: [BusinessUnitsService]
})
export class BusinessUnitsModule {}
