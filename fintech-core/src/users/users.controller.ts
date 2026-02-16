import { Controller, Post, Get, Body, Param, Patch, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post() // POST /users
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id') // GET /users/:id
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Get() // GET /users 
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id') // PATCH /users/1
  update(@Param('id') id: string, @Body() updateData: Partial<CreateUserDto>) {
    return this.usersService.update(+id, updateData);
  }

  @Delete(':id') // DELETE /users/1
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }


  

}