import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFileDtoOwnership } from '../lib/codebase-rules/dto-ownership.mjs';

test('class-validator in frontend or shared packages triggers error', () => {
  const code = `
    import { IsString, IsNotEmpty } from 'class-validator';
    export class UserForm {
      @IsString()
      name: string;
    }
  `;
  const diagnosticsWeb = checkFileDtoOwnership(
    '/workspace/apps/web/src/forms/user.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnosticsWeb.length, 1);
  assert.equal(diagnosticsWeb[0].rule, 'DTO_BOUNDARY');
  assert.equal(diagnosticsWeb[0].severity, 'error');

  const diagnosticsTypes = checkFileDtoOwnership(
    '/workspace/packages/types/src/user.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnosticsTypes.length, 1);
  assert.equal(diagnosticsTypes[0].severity, 'error');
});

test('class-validator inside apps/api/src/auth/dto/login.dto.ts passes without errors', () => {
  const code = `
    import { IsEmail, IsString } from 'class-validator';
    import { Type } from 'class-transformer';
    export class LoginDto {
      @IsEmail()
      email: string;
    }
  `;
  const diagnostics = checkFileDtoOwnership(
    '/workspace/apps/api/src/auth/dto/login.dto.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 0);
});

test('class-validator inside apps/api outside dto/ directory triggers warning', () => {
  const code = `
    import { IsString } from 'class-validator';
    export class ServiceHelper {}
  `;
  const diagnostics = checkFileDtoOwnership(
    '/workspace/apps/api/src/auth/auth.service.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].severity, 'warning');
});

test('frontend importing server DTO triggers error', () => {
  const code = `
    import { LoginDto } from '../../../../api/src/auth/dto/login.dto';
  `;
  const diagnostics = checkFileDtoOwnership(
    '/workspace/apps/web/src/features/auth/use-login.ts',
    '/workspace',
    code,
  );
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].rule, 'DTO_BOUNDARY');
  assert.equal(diagnostics[0].severity, 'error');
});
