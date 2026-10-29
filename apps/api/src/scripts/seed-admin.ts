import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../../../../.env'),
  quiet: true,
});
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
dotenv.config({ quiet: true });

import {
  closeDbClient,
  createDbClient,
  usersRepository,
} from '@repo/database';
import { hashPassword } from 'better-auth/crypto';

interface AdminSeedArgs {
  email?: string;
  password?: string;
  name?: string;
}

function parseArgs(): AdminSeedArgs {
  const args = process.argv.slice(2);
  const result: AdminSeedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && i + 1 < args.length) {
      result.email = args[++i];
    } else if (arg === '--password' && i + 1 < args.length) {
      result.password = args[++i];
    } else if (arg === '--name' && i + 1 < args.length) {
      result.name = args[++i];
    }
  }

  return result;
}

function generateSecurePassword(length = 16): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function run() {
  console.log('[SeedAdmin] Starting Admin setup...');

  const cliArgs = parseArgs();
  const email = (
    cliArgs.email ||
    process.env.ADMIN_EMAIL ||
    'admin@example.com'
  )
    .trim()
    .toLowerCase();
  const name = cliArgs.name || process.env.ADMIN_NAME || 'Admin';
  const generatedPassword = !cliArgs.password && !process.env.ADMIN_PASSWORD;
  const password =
    cliArgs.password ||
    process.env.ADMIN_PASSWORD ||
    generateSecurePassword(16);

  if (!email.includes('@')) {
    console.error(`[SeedAdmin] Invalid email: "${email}"`);
    process.exit(1);
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/app_db';
  const db = createDbClient(dbUrl);

  try {
    const hashedPassword = await hashPassword(password);

    const existingUser = await usersRepository.findByEmail(db, email, {
      includeDeleted: true,
    });

    if (existingUser) {
      console.log(
        `[SeedAdmin] User "${email}" already exists (ID: ${existingUser.id}). Elevating to admin...`,
      );

      await usersRepository.update(db, existingUser.id, {
        role: 'admin',
        emailVerified: true,
        name: existingUser.name || name,
      });

      const accounts = await usersRepository.findAccountsByUserId(
        db,
        existingUser.id,
      );
      const existingAccount = accounts[0];

      if (existingAccount) {
        await usersRepository.updateAccount(db, existingAccount.id, {
          password: hashedPassword,
        });
      } else {
        const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await usersRepository.createAccount(db, {
          id: accountId,
          accountId: existingUser.id,
          providerId: 'credential',
          userId: existingUser.id,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      await usersRepository.insert(db, {
        id: userId,
        name,
        email,
        emailVerified: true,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usersRepository.createAccount(db, {
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`[SeedAdmin] Created new admin user: ${email}`);
    }

    console.log('[SeedAdmin] Admin successfully configured.');
    if (generatedPassword) {
      console.log(`[SeedAdmin] Generated Password: ${password}`);
    }
  } catch (error) {
    console.error('[SeedAdmin] Error seeding admin:', error);
    process.exit(1);
  } finally {
    await closeDbClient(db);
  }
}

run();
