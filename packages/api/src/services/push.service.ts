import * as admin from 'firebase-admin';

let firebaseReady = false;

function tryInitFirebase(): void {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !raw?.trim()) {
    console.warn(
      '[push] Firebase desactivado: faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY.',
    );
    return;
  }
  const privateKey = raw.replace(/\\n/g, '\n');
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    firebaseReady = true;
  } catch {
    console.warn(
      '[push] Firebase desactivado: clave privada inválida o placeholder en .env. Las push no se enviarán hasta usar credenciales reales de la cuenta de servicio.',
    );
  }
}

tryInitFirebase();

export const sendPushNotification = async (data: {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  if (isExpoPushToken(data.pushToken)) {
    await sendExpoPushNotification(data);
    return;
  }

  if (!firebaseReady) {
    return;
  }
  try {
    await admin.messaging().send({
      token: data.pushToken,
      notification: { title: data.title, body: data.body },
      data: data.data,
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'messaging/registration-token-not-registered') {
      console.warn(`Push token invalido: ${data.pushToken}`);
    } else {
      throw err;
    }
  }
};

function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

async function sendExpoPushNotification(data: {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: data.pushToken,
      title: data.title,
      body: data.body,
      data: data.data,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    }),
  });

  if (!res.ok) {
    throw new Error(`Expo push failed with status ${res.status}`);
  }

  const payload = (await res.json()) as {
    data?: { status?: string; message?: string; details?: { error?: string } };
  };
  const error = payload.data?.details?.error;
  if (payload.data?.status === 'error' && error !== 'DeviceNotRegistered') {
    throw new Error(payload.data.message ?? `Expo push error: ${error ?? 'unknown'}`);
  }
}
