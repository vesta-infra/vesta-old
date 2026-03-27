import { Global, Module } from '@nestjs/common';
import { TemplateEngine } from './template.engine';

@Global()
@Module({
  providers: [TemplateEngine],
  exports: [TemplateEngine],
})
export class TemplateModule {}
