const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const SENDGRID_API_KEY = functions.config().sendgrid.key;

const mailTransport = nodemailer.createTransport({
    service: "SendGrid",
    auth: {
        user: "apikey",
        pass: SENDGRID_API_KEY,
    },
});

const userPhoneMap = {
    // ... tu lista de teléfonos ...
};

exports.onTaskCreatedSendNotifications = functions.firestore
    .document("contentSchedule/{contentId}")
    .onCreate(async (snap, context) => {
        const data = snap.data();

        if (!data || !data.responsibleEmails || data.responsibleEmails.length === 0) {
            return null;
        }

        const emails = data.responsibleEmails;
        
        // Configuración de marca y URLs
        const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.appspot.com/o/multimedia-logo.png?alt=media&token=439e6e68-c672-4860-ae45-bf5dbddf3acb";
        const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';
        const PANEL_URL = "https://adminmultimediavisionpentacostes.netlify.app/mi-contenido";
        const PRIMARY_COLOR = "#3B82F6";
        const LIGHT_GRAY = "#f9f9f9";

        const mailOptions = {
            from: FROM_EMAIL,
            to: emails.join(","),
            subject: `¡Nueva Tarea Asignada!: ${data.type}`,
            
            html: `
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <table width="100%" max-width="600px" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        
        <tr>
            <td align="center" style="padding: 20px 30px;">
                <img src="${LOGO_URL}" alt="Logo Multimedia" style="width: 100px; height: auto;">
            </td>
        </tr>

        <tr>
            <td style="padding: 10px 30px 20px 30px;">
                <h1 style="font-size: 24px; color: #333; margin-bottom: 10px;">¡Nueva Tarea Asignada! ✅</h1>
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    ¡Hola equipo! Se ha programado y asignado una nueva tarea en su Vision Board. ¡Manos a la obra!
                </p>
                
                <div style="background-color: ${LIGHT_GRAY}; border-left: 4px solid ${PRIMARY_COLOR}; border-radius: 5px; padding: 15px; margin-top: 25px;">
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Tipo:</strong> ${data.type}
                    </p>
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Plataforma:</strong> ${data.platform}
                    </p>
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Fecha de Pub.:</strong> ${data.publishDate || "N/A"}
                    </p>
                    <p style="margin: 5px 0; font-size: 16px;">
                        <strong>Idea Clave:</strong> ${data.contentIdea}
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${PANEL_URL}" target="_blank" style="background-color: ${PRIMARY_COLOR}; color: #ffffff; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        🖥️ IR A MIS TAREAS ASIGNADAS
                    </a>
                </div>

                <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 20px;">
                    ¡Tu compromiso es clave para la Visión de la iglesia!
                </p>
            </td>
        </tr>

        <tr>
            <td align="center" style="padding: 20px 30px; border-top: 1px solid #ddd; background-color: #f0f0f0; border-radius: 0 0 8px 8px;">
                <p style="font-size: 12px; color: #777; margin-bottom: 5px;">
                    © ${new Date().getFullYear()} Multimedia Visión Pentecostés. Todos los derechos reservados.
                </p>
                <p style="font-size: 12px; color: #777; margin-top: 5px;">
                    Este es un mensaje automático. Por favor, no responda a este correo.
                </p>
            </td>
        </tr>

    </table>
</body>
            `,
        };

        // AÑADE ESTA LÍNEA DE LOG ANTES DEL TRY
console.log("INTENTO DE ENVIO INICIADO");

try {
    await mailTransport.sendMail(mailOptions);
    console.log("Emails enviados exitosamente a:", emails.join(","));
} catch (error) {
    console.error("Error al enviar email:", error);
}

        try {
            await mailTransport.sendMail(mailOptions);
            console.log("Emails enviados exitosamente a:", emails.join(","));
        } catch (error) {
            console.error("Error al enviar email:", error);
        }

        return null;
    });