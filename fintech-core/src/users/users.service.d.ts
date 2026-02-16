import { PrismaService } from '../prisma-service/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateUserDto): Promise<{
        email: string;
        password_hash: string;
        id: number;
    }>;
    findOne(id: number): Promise<{
        email: string;
        password_hash: string;
        id: number;
    } | null>;
}
