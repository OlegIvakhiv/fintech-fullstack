import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma-service/prisma.service'; // Виправлений шлях до PrismaService
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    // 1. Шукаємо користувача в БД
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Wrong email or password');
    }

    // 2. Перевіряємо пароль (припускаємо, що в БД він хешований)
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Wrong email or password');
    }

    // 3. Формуємо Payload для токена
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role // ЦЕ ТЕ, ЩО ЧИТАЄ ТВІЙ ROLESGUARD
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    };
  }
}