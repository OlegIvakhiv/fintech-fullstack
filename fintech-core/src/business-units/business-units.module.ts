import { Module } from '@nestjs/common';
import { BusinessUnitsService } from './business-units.service';
import { BusinessUnitsController } from './business-units.controller';
import { PrismaService } from '../prisma-service/prisma.service';

@Module({
  controllers: [BusinessUnitsController],
  providers: [BusinessUnitsService, PrismaService],
})
export class BusinessUnitsModule {}
