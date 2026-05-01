import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptKey,
  LoginRateLimiter,
  normalizeUsername,
  validateCredentials
} from '../src/lib/authSecurity';

test('normalizeUsername trims input', () => {
  assert.equal(normalizeUsername('  Himanshu_01  '), 'Himanshu_01');
  assert.equal(normalizeUsername(undefined), '');
});

test('validateCredentials enforces username and password rules', () => {
  assert.equal(validateCredentials('', ''), 'Username and password are required');
  assert.match(validateCredentials('ab', 'password123') || '', /Username must be/);
  assert.match(validateCredentials('valid_user', 'short') || '', /Password must be at least/);
  assert.equal(validateCredentials('valid_user', 'password123'), null);
});

test('attemptKey is case-insensitive for username', () => {
  assert.equal(attemptKey('127.0.0.1', 'UserA'), attemptKey('127.0.0.1', 'usera'));
});

test('rate limiter blocks after repeated failures and resets on clear', () => {
  const limiter = new LoginRateLimiter();
  const key = attemptKey('127.0.0.1', 'load_test_user');

  for (let i = 0; i < 5; i += 1) {
    limiter.recordFailure(key);
  }

  const blocked = limiter.isLimited(key);
  assert.equal(blocked.limited, true);
  assert.ok((blocked.retryAfterSec || 0) > 0);

  limiter.clear(key);
  assert.equal(limiter.isLimited(key).limited, false);
});
