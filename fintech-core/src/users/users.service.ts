import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma-service/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // create a new user with specified email, password, name, and role. 
  // The request body should contain these details.

  async create(data: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role || 'INVESTOR'
        }
      });
      // After creating the user, we also create a default portfolio for them.
      await tx.portfolio.create({
        data: {
          name: 'Default Portfolio',
          userId: user.id
        }
      });

      return user;
    });
  }

  // list all users in the system. T
  // his is a simple retrieval of all user records from the database.
async findAll() {
  return this.prisma.user.findMany({
    include: { portfolios: { select: { id: true } } },
  });
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

  // src/users/users.service.ts
  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Користувача не знайдено');
    return user;
  }


}



