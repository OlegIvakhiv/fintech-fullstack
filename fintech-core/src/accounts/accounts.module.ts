import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma-service/prisma.service';

// This module manages accounts - creating new accounts and listing accounts by portfolio.
// It uses PrismaService for database operations and has a controller to handle HTTP requests.

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, PrismaService],
})
export class AccountsModule {}