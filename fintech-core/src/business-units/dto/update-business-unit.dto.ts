import { PartialType } from '@nestjs/mapped-types';
import { CreateBusinessUnitDto } from './create-business-unit.dto';

// update a business unit's information based on its ID.
export class UpdateBusinessUnitDto extends PartialType(CreateBusinessUnitDto) {}
