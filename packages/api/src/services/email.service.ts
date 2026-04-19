import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Taula <hola@taula.ad>';

interface ReservationConfirmedEmail {
  type: 'RESERVATION_CONFIRMED';
  userEmail: string;
  userName: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  code: string;
}

interface ReservationPendingEmail {
  type: 'RESERVATION_PENDING';
  userEmail: string;
  userName: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  code: string;
}

interface RestaurantNewReservationEmail {
  type: 'RESTAURANT_NEW_RESERVATION';
  restaurantEmail: string;
  restaurantName: string;
  userName: string;
  date: string;
  time: string;
  partySize: number;
  code: string;
  requiresApproval: boolean;
}

interface RestaurantCancellationEmail {
  type: 'RESTAURANT_CANCELLATION';
  restaurantEmail: string;
  restaurantName: string;
  userName: string;
  date: string;
  time: string;
  partySize: number;
  code: string;
}

interface ReminderEmail {
  type: 'REMINDER_24H' | 'REMINDER_2H';
  userEmail: string;
  userName: string;
  restaurantName: string;
  restaurantAddress: string;
  date: string;
  time: string;
  partySize: number;
  code: string;
}

interface NoShowChargeEmail {
  type: 'NoShowChargeEmail';
  to: string;
  userName: string;
  restaurantName: string;
  reservationCode: string;
  amount: number;
  date: string;
  time: string;
}

interface RestaurantNoShowChargedEmail {
  type: 'RestaurantNoShowChargedEmail';
  to: string;
  restaurantName: string;
  reservationCode: string;
  guestName: string;
  amount: number;
  date: string;
  time: string;
}

type EmailJob =
  | ReservationConfirmedEmail
  | ReservationPendingEmail
  | RestaurantNewReservationEmail
  | RestaurantCancellationEmail
  | ReminderEmail
  | NoShowChargeEmail
  | RestaurantNoShowChargedEmail;

export class EmailService {
  constructor(private prisma: PrismaClient) {}

  async queueEmail(data: NoShowChargeEmail | RestaurantNoShowChargedEmail) {
    await sendEmail(data);
  }
}

export const sendEmail = async (data: EmailJob) => {
  try {
    if (data.type === 'RESERVATION_CONFIRMED') {
      await resend.emails.send({
        from: FROM,
        to: data.userEmail,
        subject: `Reserva confirmada - ${data.restaurantName}`,
        html: buildConfirmationEmail(data),
      });
    } else if (data.type === 'RESERVATION_PENDING') {
      await resend.emails.send({
        from: FROM,
        to: data.userEmail,
        subject: `Reserva pendiente - ${data.restaurantName}`,
        html: buildPendingEmail(data),
      });
    } else if (data.type === 'RESTAURANT_NEW_RESERVATION') {
      await resend.emails.send({
        from: FROM,
        to: data.restaurantEmail,
        subject: `${data.requiresApproval ? '⏳ Reserva pendiente' : '✅ Nueva reserva'} - ${data.userName}`,
        html: buildRestaurantNewReservationEmail(data),
      });
    } else if (data.type === 'RESTAURANT_CANCELLATION') {
      await resend.emails.send({
        from: FROM,
        to: data.restaurantEmail,
        subject: `Reserva cancelada - ${data.userName}`,
        html: buildRestaurantCancellationEmail(data),
      });
    } else if (data.type === 'REMINDER_24H' || data.type === 'REMINDER_2H') {
      const timeLabel = data.type === 'REMINDER_24H' ? '24 horas' : '2 horas';
      await resend.emails.send({
        from: FROM,
        to: data.userEmail,
        subject: `Recordatorio: tu reserva en ${data.restaurantName} en ${timeLabel}`,
        html: buildReminderEmail(data, timeLabel),
      });
    } else if (data.type === 'NoShowChargeEmail') {
      await resend.emails.send({
        from: FROM,
        to: data.to,
        subject: `Cargo por no presentarse - ${data.restaurantName}`,
        html: buildNoShowChargeEmail(data),
      });
    } else if (data.type === 'RestaurantNoShowChargedEmail') {
      await resend.emails.send({
        from: FROM,
        to: data.to,
        subject: `No-show cobrado - ${data.reservationCode}`,
        html: buildRestaurantNoShowChargedEmail(data),
      });
    }
  } catch (err) {
    console.error('Failed to send email:', (err as Error).message);
  }
};

const buildConfirmationEmail = (data: ReservationConfirmedEmail): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #FF5C3A; font-size: 28px; margin: 0;">taula</h1>
    </div>
    <h2 style="color: #1A1A1A; font-size: 22px;">Reserva confirmada!</h2>
    <p style="color: #666;">Hola ${data.userName}, tu mesa esta reservada.</p>
    <div style="background: #FAFAF8; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0; font-size: 18px; font-weight: bold;">${data.restaurantName}</p>
      <p style="margin: 4px 0; color: #666;">${data.date} a las ${data.time}</p>
      <p style="margin: 4px 0; color: #666;">${data.partySize} persona${data.partySize > 1 ? 's' : ''}</p>
    </div>
    <div style="background: #FF5C3A; border-radius: 8px; padding: 12px; text-align: center;">
      <p style="color: white; font-size: 20px; font-weight: bold; margin: 0; letter-spacing: 2px;">${data.code}</p>
      <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0;">Codigo de reserva</p>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
      Taula - La teva taula t'espera - <a href="https://taula.ad" style="color: #FF5C3A;">taula.ad</a>
    </p>
  </div>
</body>
</html>
`;

const buildPendingEmail = (data: ReservationPendingEmail): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A853; text-align: center;">taula</h1>
    <h2 style="color: #1A1A1A;">Reserva pendiente de confirmacion</h2>
    <p>Hola ${data.userName}, tu solicitud de reserva ha sido recibida y esta pendiente de confirmacion por el restaurante.</p>
    <div style="background: #FAFAF8; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0; font-size: 18px; font-weight: bold;">${data.restaurantName}</p>
      <p style="margin: 4px 0; color: #666;">${data.date} a las ${data.time}</p>
      <p style="margin: 4px 0; color: #666;">${data.partySize} persona${data.partySize > 1 ? 's' : ''}</p>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center;">Te avisaremos cuando el restaurante confirme tu reserva.</p>
  </div>
</body>
</html>
`;

const buildRestaurantNewReservationEmail = (data: RestaurantNewReservationEmail): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A853; text-align: center;">taula</h1>
    <h2 style="color: #1A1A1A;">${data.requiresApproval ? 'Nueva solicitud de reserva' : 'Nueva reserva confirmada'}</h2>
    <div style="background: #FAFAF8; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0;"><strong>Cliente:</strong> ${data.userName}</p>
      <p style="margin: 4px 0;"><strong>Fecha:</strong> ${data.date}</p>
      <p style="margin: 4px 0;"><strong>Hora:</strong> ${data.time}</p>
      <p style="margin: 4px 0;"><strong>Comensales:</strong> ${data.partySize}</p>
      <p style="margin: 4px 0;"><strong>Codigo:</strong> ${data.code}</p>
    </div>
    ${data.requiresApproval ? '<p style="color: #D4A853; font-weight: bold;">Entra al panel de Taula para aceptar o rechazar esta reserva.</p>' : ''}
  </div>
</body>
</html>
`;

const buildRestaurantCancellationEmail = (data: RestaurantCancellationEmail): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A853; text-align: center;">taula</h1>
    <h2 style="color: #E53E3E;">Reserva cancelada</h2>
    <p>El cliente ha cancelado su reserva.</p>
    <div style="background: #FAFAF8; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0;"><strong>Cliente:</strong> ${data.userName}</p>
      <p style="margin: 4px 0;"><strong>Fecha:</strong> ${data.date}</p>
      <p style="margin: 4px 0;"><strong>Hora:</strong> ${data.time}</p>
      <p style="margin: 4px 0;"><strong>Comensales:</strong> ${data.partySize}</p>
      <p style="margin: 4px 0;"><strong>Codigo:</strong> ${data.code}</p>
    </div>
  </div>
</body>
</html>
`;

const buildReminderEmail = (data: ReminderEmail, timeLabel: string): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #FF5C3A; text-align: center;">taula</h1>
    <h2 style="color: #1A1A1A;">Tu reserva es en ${timeLabel}</h2>
    <p>Hola ${data.userName}, te recordamos tu reserva en <strong>${data.restaurantName}</strong>.</p>
    <div style="background: #FAFAF8; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0; font-size: 18px; font-weight: bold;">${data.restaurantName}</p>
      <p style="margin: 4px 0; color: #666;">${data.date} a las ${data.time}</p>
      <p style="margin: 4px 0; color: #666;">${data.restaurantAddress}</p>
      <p style="margin: 4px 0; color: #666;">${data.partySize} persona${data.partySize > 1 ? 's' : ''}</p>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center;">Codigo: <strong>${data.code}</strong></p>
  </div>
</body>
</html>
`;

const buildNoShowChargeEmail = (data: NoShowChargeEmail): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A853; text-align: center;">taula</h1>
    <h2 style="color: #DC2626;">Cargo por no presentarse</h2>
    <p style="color: #666;">Hola ${data.userName},</p>
    <p style="color: #666;">
      No te has presentado a tu reserva en <strong>${data.restaurantName}</strong>
      el ${data.date} a las ${data.time}.
    </p>
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0; color: #991B1B;"><strong>Penalizacion aplicada:</strong></p>
      <p style="margin: 8px 0; font-size: 24px; font-weight: bold; color: #DC2626;">${data.amount.toFixed(2)} €</p>
      <p style="margin: 4px 0; color: #666; font-size: 13px;">Reserva: ${data.reservationCode}</p>
    </div>
    <p style="color: #666; font-size: 13px;">
      Este cargo se ha realizado conforme a la politica de no-show del restaurante,
      que aceptaste al proporcionar tu tarjeta como garantia.
    </p>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
      Si crees que esto es un error, contacta con el restaurante directamente.<br/>
      Taula - <a href="https://taula.ad" style="color: #D4A853;">taula.ad</a>
    </p>
  </div>
</body>
</html>
`;

const buildRestaurantNoShowChargedEmail = (data: RestaurantNoShowChargedEmail): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Inter, sans-serif; background: #FAFAF8; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <h1 style="color: #D4A853; text-align: center;">taula</h1>
    <h2 style="color: #1A1A1A;">No-show: penalizacion cobrada</h2>
    <p style="color: #666;">
      El cliente <strong>${data.guestName}</strong> no se ha presentado a su reserva.
      Se ha cobrado la penalizacion automaticamente.
    </p>
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 4px 0;"><strong>Reserva:</strong> ${data.reservationCode}</p>
      <p style="margin: 4px 0;"><strong>Fecha:</strong> ${data.date} a las ${data.time}</p>
      <p style="margin: 8px 0; font-size: 20px; font-weight: bold; color: #16A34A;">${data.amount.toFixed(2)} € cobrados</p>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">
      Taula - <a href="https://taula.ad" style="color: #D4A853;">taula.ad</a>
    </p>
  </div>
</body>
</html>
`;
