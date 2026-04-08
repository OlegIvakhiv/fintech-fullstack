import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { Observable } from 'rxjs';

// This guard is used to check if a user has the required roles to access a route
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  // This method is called when the guard is used
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }
    // Get the user object from the request
    const request = context.switchToHttp().getRequest();
    const user = request.user; // This is set by your authentication guard (e.g., JwtAuthGuard)

    // If the user is not authenticated, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    // Check if the user has the required role
    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    // If the user has the required role, allow access
    return true;
  }
}