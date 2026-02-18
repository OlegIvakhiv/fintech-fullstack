import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // create a new user with specified email, password, name, and role. 
  // The request body should contain these details.
  async create(data: CreateUserDto) {
    return this.prisma.user.create({ 
        data: {
            email: data.email,
            password: data.password, 
            name: data.name,
            role: data.role || 'INVESTOR'
        } 
    });
  }

  // list all users in the system. T
  // his is a simple retrieval of all user records from the database.
  async findAll() {
    return this.prisma.user.findMany();
  }

  // update a user's information based on their ID. 
  // This allows modifying the user's details such as email or password.
 async update(id: number, data: Partial<CreateUserDto>) {
    return this.prisma.user.update({ where: { id }, data });
  }

  // retrieve details of a specific user by their ID. 
  // This is used to get information about a single user.
async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true,
        portfolios: true 
      }
    });
  }

  // delete a user from the system based on their ID. 
  // This removes the user's record from the database.
  async remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }
}



