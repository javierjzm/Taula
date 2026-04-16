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

type EmailJob = ReservationConfirmedEmail | ReminderEmail;

export const sendEmail = async (data: EmailJob) => {
  if (data.type === 'RESERVATION_CONFIRMED') {
    await resend.emails.send({
      from: FROM,
      to: data.userEmail,
      subject: `Reserva confirmada - ${data.restaurantName}`,
      html: buildConfirmationEmail(data),
    });
  } else if (data.type === 'REMINDER_24H' || data.type === 'REMINDER_2H') {
    const timeLabel = data.type === 'REMINDER_24H' ? '24 horas' : '2 horas';
    await resend.emails.send({
      from: FROM,
      to: data.userEmail,
      subject: `Recordatorio: tu reserva en ${data.restaurantName} en ${timeLabel}`,
      html: buildReminderEmail(data, timeLabel),
    });
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
