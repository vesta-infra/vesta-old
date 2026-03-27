import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import * as dbExports from '@vesta/db';
import configuration from './config/configuration';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HealthModule } from './modules/health/health.module';
import { ServersModule } from './modules/servers/servers.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { DomainsModule } from './modules/domains/domains.module';
import { DeployHooksModule } from './modules/deploy-hooks/deploy-hooks.module';
import { ResourceLimitsModule } from './modules/resource-limits/resource-limits.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { ServiceLinksModule } from './modules/service-links/service-links.module';
import { DatabasesModule } from './modules/databases/databases.module';
import { BackupsModule } from './modules/backups/backups.module';
import { CronJobsModule } from './modules/cron-jobs/cron-jobs.module';
import { LogsModule } from './modules/logs/logs.module';
import { GatewayModule } from './gateway/gateway.module';
import { TemplateModule } from './common/templates/template.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

const {
  AppDataSource: _ds,
  createDataSourceOptions: _opts,
  ...entityClasses
} = dbExports;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: Object.values(entityClasses).filter(
          (v) => typeof v === 'function',
        ),
        synchronize: config.get<string>('NODE_ENV', 'development') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
    }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>('redis.url', 'redis://localhost:6379'),
        );
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number.parseInt(redisUrl.port, 10) || 6379,
            password: redisUrl.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    HealthModule,
    ServersModule,
    EnvironmentsModule,
    DeploymentsModule,
    SecretsModule,
    DomainsModule,
    DeployHooksModule,
    ResourceLimitsModule,
    EventsModule,
    QueueModule,
    TemplateModule,
    ServiceLinksModule,
    DatabasesModule,
    BackupsModule,
    CronJobsModule,
    LogsModule,
    GatewayModule,
    MaintenanceModule,
    WebhooksModule,
    ActivityModule,
    NotificationsModule,
  ],
})
export class AppModule {}
