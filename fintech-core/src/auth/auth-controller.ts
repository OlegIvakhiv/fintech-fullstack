// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Prisma } from '@prisma/client';

// This controller handles user registration and login
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) { }

  @HttpCode(HttpStatus.OK)
  @Post('login') // POST /auth/login
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.login(signInDto.email, signInDto.password);
  }


  @Post('register') // POST /auth/register
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.usersService.create({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        role: 'INVESTOR', // default role
      });
      // Return user without password (you might want to exclude password field)
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }
}