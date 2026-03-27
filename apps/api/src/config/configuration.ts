export default () => ({
  port: parseInt(process.env.API_PORT!, 10) || 3001,
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgres://vesta:vesta@localhost:5432/vesta',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY || 'change-me',
  },
});
