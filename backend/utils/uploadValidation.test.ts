import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCanonicalUploadExtension,
  isMimeTypeAllowedForCategory,
  matchesDeclaredUploadType,
} from './uploadValidation';

test('uses a canonical extension derived from MIME type', () => {
  assert.equal(getCanonicalUploadExtension('application/pdf'), '.pdf');
  assert.equal(getCanonicalUploadExtension('image/jpeg'), '.jpg');
});

test('limits file types for specialized upload categories', () => {
  assert.equal(isMimeTypeAllowedForCategory('certificate', 'application/pdf'), true);
  assert.equal(isMimeTypeAllowedForCategory('certificate', 'image/png'), false);
  assert.equal(isMimeTypeAllowedForCategory('avatar', 'application/pdf'), false);
  assert.equal(isMimeTypeAllowedForCategory('avatar', 'image/webp'), true);
});

test('checks file signatures instead of trusting multipart MIME type', () => {
  assert.equal(matchesDeclaredUploadType(Buffer.from('%PDF-1.7\n'), 'application/pdf'), true);
  assert.equal(matchesDeclaredUploadType(Buffer.from('<html>not a pdf</html>'), 'application/pdf'), false);
  assert.equal(
    matchesDeclaredUploadType(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/png',
    ),
    true,
  );
  assert.equal(matchesDeclaredUploadType(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'), true);
  assert.equal(matchesDeclaredUploadType(Buffer.from('plain text'), 'image/jpeg'), false);
});
