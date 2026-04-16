import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwt';

describe('JWT Utils', () => {
  const payload = { sub: 'user-1', type: 'user' as const };

  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify an access token', () => {
      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.type).toBe(payload.type);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a refresh token', () => {
      const token = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.type).toBe(payload.type);
    });

    it('should not verify access token as refresh', () => {
      const accessToken = signAccessToken(payload);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});
