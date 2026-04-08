import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './guards/jwt.strategy'; 
import { AuthController } from './auth-controller';
import { UsersModule } from 'src/users/users.module';

// This module handles user authentication and authorization
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
     forwardRef(() => UsersModule),
  ],
  providers: [AuthService, JwtStrategy], 
  exports: [AuthService, PassportModule], 
  controllers: [AuthController],
})
export class AuthModule {}