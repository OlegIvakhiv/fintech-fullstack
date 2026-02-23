import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from 'src/auth/auth-module';

// This module manages users - creating, listing, etc.
//  It uses PrismaService for database operations and has a controller to handle HTTP requests.

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
