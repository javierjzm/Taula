import { describe, it, expect } from 'vitest';
import { generateReservationCode } from '../utils/reservationCode';

describe('generateReservationCode', () => {
  it('should start with TAU-', () => {
    const code = generateReservationCode();
    expect(code).toMatch(/^TAU-/);
  });

  it('should have exactly 8 characters (TAU-XXXX)', () => {
    const code = generateReservationCode();
    expect(code).toHaveLength(8);
  });

  it('should generate unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReservationCode()));
    expect(codes.size).toBe(100);
  });

  it('should only contain valid characters', () => {
    const code = generateReservationCode();
    const suffix = code.slice(4);
    expect(suffix).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
});
