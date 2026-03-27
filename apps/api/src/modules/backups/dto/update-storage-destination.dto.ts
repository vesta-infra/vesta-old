import { PartialType } from '@nestjs/swagger';
import { CreateStorageDestinationDto } from './create-storage-destination.dto';

export class UpdateStorageDestinationDto extends PartialType(CreateStorageDestinationDto) {}
