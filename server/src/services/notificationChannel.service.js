/**
 * RN-NOT-01 / RN-NOT-02 / AC-SOL-09-7: canales externos opcionales del aviso.
 * El aviso interno (tabla notifications) es el único obligatorio; correo y WhatsApp se
 * envían solo si están configurados. Sin proveedor, el aviso interno no se cae.
 */
let channels = {
  email: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
  whatsapp: process.env.NOTIFICATION_WHATSAPP_ENABLED === 'true',
};

const deliveries = [];

export const notificationChannelService = {
  setChannels(config = {}) {
    channels = { ...channels, ...config };
  },

  getDeliveries() {
    return [...deliveries];
  },

  reset() {
    deliveries.length = 0;
  },

  /** Registra el envío externo cuando el canal está configurado. Nunca lanza. */
  async sendNotice({ notification, recipient }) {
    try {
      if (channels.email && recipient?.email) {
        deliveries.push({
          channel: 'EMAIL',
          to: recipient.email,
          notificationId: notification?.id ?? null,
          type: notification?.type ?? null,
        });
      }
      if (channels.whatsapp && (recipient?.phone || recipient?.email)) {
        deliveries.push({
          channel: 'WHATSAPP',
          to: recipient.phone || recipient.email,
          notificationId: notification?.id ?? null,
          type: notification?.type ?? null,
        });
      }
    } catch (error) {
      console.error('[NotificationChannel] Error enviando aviso externo:', error.message);
    }
  },
};
