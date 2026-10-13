import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { closeDbClient, createDbClient, DbClient } from '@repo/database';
import { EnvVars } from '../config/env.validation';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: DbClient;

  constructor(private configService: ConfigService<EnvVars, true>) {
    const connectionString =
      this.configService.get('DATABASE_URL', { infer: true }) ||
      'postgres://postgres:postgres@localhost:5432/app_db';

    this.db = createDbClient(connectionString);
  }

  async onModuleDestroy() {
    await closeDbClient(this.db);
  }
}
