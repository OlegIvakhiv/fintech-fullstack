import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './guards/jwt.strategy'; // ПЕРЕВІР ЦЕЙ ІМПОРТ
import { AuthController } from './auth-controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy], // СТРАТЕГІЯ ТУТ
  exports: [AuthService, PassportModule], // ЕКСПОРТ ПАСПОРТА ТУТ
  controllers: [AuthController],
})
export class AuthModule {}