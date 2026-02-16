import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // create a new user with the provided data (email and password). The request body should contain these details.
  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }

  // list all users in the system. This is a simple retrieval of all user records from the database.
  async findAll() {
    return this.prisma.user.findMany();
  }

  // update an existing user's details (email and/or password) based on their ID. The request body can contain any subset of the user fields to be updated.
  async update(id: number, data: Partial<CreateUserDto>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
  // find a single user by their ID. This retrieves the user's details from the database based on the provided ID.
  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });
  }
  // delete a user from the system based on their ID. This removes the user's record from the database.
  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}



