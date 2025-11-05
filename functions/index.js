// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// --- CONFIGURACIÓN DE EMAIL (SendGrid) ---
const SENDGRID_API_KEY = functions.config().sendgrid.key;

const mailTransport = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey",
    pass: SENDGRID_API_KEY,
  },
});

// (El mapa de teléfonos no se usa en esta función, pero está bien dejarlo)
const userPhoneMap = {
  // ... tu lista de teléfonos ...
};

/**
 * Función que se dispara cuando se CREA una nueva tarea en contentSchedule
 */
exports.onTaskCreatedSendNotifications = functions.firestore
  .document("contentSchedule/{contentId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();

    if (!data) {
      console.log("No data found in snapshot.");
      return;
    }

    const emails = data.responsibleEmails;
    if (!emails || emails.length === 0) {
      console.log("No responsible emails found.");
      return;
    }

    console.log(`Enviando ${emails.length} notificaciones...`);

    // ================================================================
    // ¡AQUÍ ESTÁ EL CAMBIO!
    // ================================================================

    // 1. Pega la URL pública de tu logo (de Firebase Storage)
    const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.appspot.com/o/multimedia-logo.png?alt=media&token=439e6e68-c672-4860-ae45-bf5dbddf3acb";

    // 2. Este es el email remitente (Cámbialo según la Opción 1 o 2 de arriba)
    const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';

    const mailOptions = {
      from: FROM_EMAIL,
      to: emails.join(","),
      subject: `¡Nueva Tarea Asignada!: ${data.type}`,
      
      // HTML Profesional (Usa estilos "inline" para máxima compatibilidad)
      html: `
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <table width="100%" max-width="600px" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; margin: auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            
            <tr>
              <td align="center" style="padding: 20px;">
                <img src="${LOGO_URL}" alt="Logo Multimedia" style="width: 80px; height: auto;">
              </td>
            </tr>

            <tr>
              <td style="padding: 10px 30px;">
                <h1 style="font-size: 22px; color: #333;">¡Hola equipo!</h1>
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                  Se les ha asignado una nueva tarea en el Vision Board:
                </p>
                
                <div style="background-color: #f9f9f9; border: 1px solid #eee; border-radius: 5px; padding: 15px; margin-top: 20px;">
                  <p style="margin: 5px 0; font-size: 16px;">
                    <strong>Tarea:</strong> ${data.type}
                  </p>
                  <p style="margin: 5px 0; font-size: 16px;">
                    <strong>Plataforma:</strong> ${data.platform}
                  </p>
                  <p style="margin: 5px 0; font-size: 16px;">
                    <strong>Fecha de Pub.:</strong> ${data.publishDate || "N/A"}
                  </p>
                  <p style="margin: 5px 0; font-size: 16px;">
                    <strong>Idea:</strong> ${data.contentIdea}
                  </p>
                </div>
                
                <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 20px;">
                  ¡Por favor, revisen el dashboard para más detalles!
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding: 20px 30px; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #999;">
                  © ${new Date().getFullYear()} Multimedia ICVP. Todos los derechos reservados.
                </p>
                <p style="font-size: 12px; color: #999; margin-top: 5px;">
                  <strong>Advertencia:</strong> Este es un mensaje automático. Por favor, no responda a este correo.
                </p>
              </td>
            </tr>

          </table>
        </body>
      `,
    };

    // ================================================================
    // FIN DEL CAMBIO
    // ================================================================

    try {
      await mailTransport.sendMail(mailOptions);
      console.log("Emails enviados exitosamente a:", emails.join(","));
    } catch (error) {
      console.error("Error al enviar email:", error);
    }

    return null;
  });