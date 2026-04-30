import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/auth.service';

const mockUser = {
  id: 'user-1',
  email: 'test@taula.ad',
  name: 'Test User',
  passwordHash: '$2a$12$LJ3m4ys6Gx3Rn/J9Gvq9.OZr5DlBmQkCvJUiYxW6UlMp3v7FLWVK',
  authProvider: 'email',
  preferredLang: 'ca',
  avatar: null,
  phone: null,
  googleId: null,
  appleId: null,
  pushToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma: any = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notificationPreference: {
    upsert: vi.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockPrisma);
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.notificationPreference.upsert.mockResolvedValue({ userId: mockUser.id });

      const result = await service.register({
        email: 'new@taula.ad',
        password: 'password123',
        name: 'New User',
        preferredLang: 'ca',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('should throw 409 if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@taula.ad',
          password: 'password123',
          name: 'Test',
          preferredLang: 'ca',
        }),
      ).rejects.toThrow('El email ya está en uso');
    });
  });

  describe('login', () => {
    it('should throw 401 with wrong email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@taula.ad', password: 'password123' }),
      ).rejects.toThrow('Credenciales incorrectas');
    });

    it('should throw 401 with wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2a$12$wronghash',
      });

      await expect(
        service.login({ email: 'test@taula.ad', password: 'wrongpassword' }),
      ).rejects.toThrow('Credenciales incorrectas');
    });
  });

  describe('refreshToken', () => {
    it('should throw with invalid refresh token', async () => {
      await expect(service.refreshToken('invalid-token')).rejects.toThrow();
    });
  });
});
