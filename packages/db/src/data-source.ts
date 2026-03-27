import { DataSource, type DataSourceOptions } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import * as entities from './entities';

export const createDataSourceOptions = (
  overrides?: Partial<PostgresConnectionOptions>,
): PostgresConnectionOptions => ({
  type: 'postgres' as const,
  url: process.env.DATABASE_URL || 'postgres://vesta:vesta@localhost:5432/vesta',
  entities: Object.values(entities),
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ...overrides,
});

export const AppDataSource = new DataSource(
  createDataSourceOptions() as DataSourceOptions,
);
