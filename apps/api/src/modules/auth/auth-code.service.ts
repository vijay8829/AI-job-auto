import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

interface AuthCode {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// In-memory one-time code store (single-process safe; for multi-replica use Redis)
@Injectable()
export class AuthCodeService {
  private readonly codes = new Map<string, AuthCode>();
  private readonly TTL_MS = 60_000; // 60 seconds

  generate(accessToken: string, refreshToken: string): string {
    const code = uuidv4();
    this.codes.set(code, { accessToken, refreshToken, expiresAt: Date.now() + this.TTL_MS });
    // Lazy cleanup of expired codes
    this.purgeExpired();
    return code;
  }

  exchange(code: string): AuthCode | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    this.codes.delete(code); // one-time use
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [key, val] of this.codes) {
      if (now > val.expiresAt) this.codes.delete(key);
    }
  }
}
