import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const sendPushNotification = async (data: {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  try {
    await admin.messaging().send({
      token: data.pushToken,
      notification: { title: data.title, body: data.body },
      data: data.data,
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    if ((err as any).code === 'messaging/registration-token-not-registered') {
      console.warn(`Push token invalido: ${data.pushToken}`);
    } else {
      throw err;
    }
  }
};
