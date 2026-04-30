import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(input: { email: string; password: string; name: string; preferredLang: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'El email ya está en uso');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        preferredLang: input.preferredLang,
        authProvider: 'email',
      },
    });

    await this.prisma.notificationPreference
      .upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
      .catch(() => undefined);

    return this.generateTokens(user.id, 'user');
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) throw new AppError(401, 'Credenciales incorrectas');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Credenciales incorrectas');

    return this.generateTokens(user.id, 'user');
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new AppError(400, 'Token de Google inválido');

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          avatar: payload.picture,
          googleId: payload.sub,
          authProvider: 'google',
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    return this.generateTokens(user.id, 'user');
  }

  async loginWithApple(input: {
    identityToken: string;
    user?: { name?: { firstName?: string; lastName?: string }; email?: string };
  }) {
    const appleUser = await appleSignin.verifyIdToken(input.identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    if (!appleUser.sub) throw new AppError(400, 'Token de Apple inválido');

    const email = appleUser.email || input.user?.email;
    const name = input.user?.name
      ? `${input.user.name.firstName || ''} ${input.user.name.lastName || ''}`.trim()
      : email?.split('@')[0] || 'Usuario';

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { appleId: appleUser.sub },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: email || `apple_${appleUser.sub}@taula.ad`,
          name,
          appleId: appleUser.sub,
          authProvider: 'apple',
        },
      });
    }

    return this.generateTokens(user.id, 'user');
  }

  async refreshToken(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new AppError(401, 'Usuario no encontrado');
    return this.generateTokens(user.id, 'user');
  }

  private generateTokens(sub: string, type: 'user' | 'restaurant') {
    return {
      accessToken: signAccessToken({ sub, type }),
      refreshToken: signRefreshToken({ sub, type }),
    };
  }
}
