import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";


// This module provides PrismaService as a global provider, so it can be injected into any other module
//  without needing to import PrismaModule in each of them.
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {}