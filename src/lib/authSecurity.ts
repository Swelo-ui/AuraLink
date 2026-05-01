export const TOKEN_TTL = '12h';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,24}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;

export type AttemptBucket = {
  count: number;
  firstAttemptAt: number;
};

export function nowMs(): number {
  return Date.now();
}

export function attemptKey(ip: string, username: string): string {
  return `${ip}::${username.toLowerCase()}`;
}

export function normalizeUsername(input: unknown): string {
  return String(input || '').trim();
}

export function validateCredentials(username: string, password: string): string | null {
  if (!username || !password) return 'Username/Email and password are required';
  
  const isEmail = EMAIL_REGEX.test(username);
  const isUsername = USERNAME_REGEX.test(username);

  if (!isEmail && !isUsername) {
    return 'Invalid username or email format';
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > 128) return 'Password is too long';
  return null;
}

export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptBucket>();

  isLimited(key: string): { limited: boolean; retryAfterSec?: number } {
    const bucket = this.attempts.get(key);
    if (!bucket) return { limited: false };

    const elapsed = nowMs() - bucket.firstAttemptAt;
    if (elapsed > LOGIN_WINDOW_MS) {
      this.attempts.delete(key);
      return { limited: false };
    }

    if (bucket.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfterSec = Math.ceil((LOGIN_WINDOW_MS - elapsed) / 1000);
      return { limited: true, retryAfterSec };
    }

    return { limited: false };
  }

  recordFailure(key: string): void {
    const bucket = this.attempts.get(key);
    if (!bucket) {
      this.attempts.set(key, { count: 1, firstAttemptAt: nowMs() });
      return;
    }

    if (nowMs() - bucket.firstAttemptAt > LOGIN_WINDOW_MS) {
      this.attempts.set(key, { count: 1, firstAttemptAt: nowMs() });
      return;
    }

    bucket.count += 1;
    this.attempts.set(key, bucket);
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }
}
