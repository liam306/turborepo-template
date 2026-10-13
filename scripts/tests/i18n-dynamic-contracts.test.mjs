import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const read = (file) =>
  JSON.parse(
    fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'),
  );
const lookup = (dict, key) =>
  key.split('.').reduce((value, part) => value?.[part], dict);

function verify(dict, keys) {
  for (const key of keys) assert.equal(typeof lookup(dict, key), 'string', key);
}

test('reviewed finite web dynamic key contracts exist in both locales', () => {
  const keys = [
    'auth.errorDefault',
    'common.networkError',
    'common.unexpectedError',
  ];
  for (const locale of ['en', 'vi'])
    verify(read(`apps/web/messages/${locale}.json`), keys);
});

test('reviewed mobile auth and common dynamic keys exist in both locales', () => {
  const keys = ['common.networkError', 'common.unexpectedError'];
  for (const locale of ['en', 'vi'])
    verify(read(`apps/mobile/src/locales/${locale}.json`), keys);
});

test('API role labels and common error keys exist in both locales', () => {
  for (const locale of ['en', 'vi']) {
    verify(read(`apps/api/src/i18n/${locale}/common.json`), [
      'roles.user',
      'roles.admin',
      'errors.unauthorized',
      'errors.userNotFound',
    ]);
  }
});
