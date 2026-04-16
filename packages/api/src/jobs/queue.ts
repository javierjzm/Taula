import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendEmail } from '../services/email.service';
import { sendPushNotification } from '../services/push.service';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('emails', { connection });
export const pushQueue = new Queue('push', { connection });

export const emailWorker = new Worker(
  'emails',
  async (job) => {
    await sendEmail(job.data);
  },
  { connection, concurrency: 5 },
);

export const pushWorker = new Worker(
  'push',
  async (job) => {
    await sendPushNotification(job.data);
  },
  { connection, concurrency: 10 },
);

emailWorker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});

pushWorker.on('failed', (job, err) => {
  console.error(`Push job ${job?.id} failed:`, err.message);
});
