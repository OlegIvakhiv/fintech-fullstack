import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma-service/prisma.service';

// This module manages users - creating, listing, etc. It uses PrismaService for database operations and has a controller to handle HTTP requests.

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService]
})
export class UsersModule {}
