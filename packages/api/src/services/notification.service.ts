import { PrismaClient } from '@prisma/client';

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async getUserNotifications(_userId: string) {
    // For MVP, notifications are handled via push/email only
    // This endpoint returns an empty list as a placeholder
    return [];
  }
}
