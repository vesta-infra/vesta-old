import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';

@Module({
  imports: [EventEmitterModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
