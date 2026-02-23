import { Controller, Post, Get, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from '@prisma/client/edge';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post() // POST /users
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id') // GET /users/:id
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Get() // GET /users 
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id') // PATCH /users/1
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateData: Partial<CreateUserDto>) {
    return this.usersService.update(+id, updateData);
  }

  @Delete(':id') // DELETE /users/1
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Get('find-by-email') // GET /users/find-by-email
  @Roles(Role.ADMIN)
  findByEmail(@Body('email') email: string) {
    return this.usersService.findByEmail(email);
  }

}