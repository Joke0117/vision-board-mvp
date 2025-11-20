"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTaskCreatedSendNotifications = void 0;
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const firestore_1 = require("firebase-functions/v2/firestore");
admin.initializeApp();
// Configuración de marca y URLs (Variables globales)
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/multimedia-logo.png?alt=media&token=376837ef-50fb-45ee-a1ca-90492ddefa0a";
const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';
const PANEL_URL = "https://adminmultimediavisionpentacostes.netlify.app/mi-contenido";
const ICONO_TAREA = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/tarea-asignada.png?alt=media&token=d4e21adc-5c7c-4868-8249-5d54b97249c1";
const PRIMARY_COLOR = "#3B82F6";
const LIGHT_GRAY = "#f0f0f0";
// Función principal (Cloud Function V2)
exports.onTaskCreatedSendNotifications = (0, firestore_1.onDocumentCreated)(
// Especificamos la ruta del documento, la región (us-central1)
// Y AÑADIMOS LA CONFIGURACIÓN DE 'secrets' AQUÍ:
{
    document: "contentSchedule/{contentId}",
    region: "us-central1",
    secrets: ["SENDGRID_KEY"] // ¡ESTA ES LA LÍNEA MÁGICA!
}, async (event) => {
    // Ahora, process.env.SENDGRID_KEY tendrá el valor de tu secreto
    const SENDGRID_API_KEY = process.env.SENDGRID_KEY;
    // Inicializa el transportador solo durante la ejecución
    const mailTransport = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
            user: "apikey",
            pass: SENDGRID_API_KEY,
        },
    });
    if (!event.data) {
        console.log("No data associated with the event.");
        return null;
    }
    const data = event.data.data();
    if (!data || !data.responsibleEmails || data.responsibleEmails.length === 0) {
        console.log("Función terminada: No hay correos responsables.");
        return null;
    }
    // Esta comprobación sigue siendo útil por si acaso, aunque con secrets[] debería ser inusual.
    if (!SENDGRID_API_KEY) {
        console.error("Error: SENDGRID_KEY no está definida en el entorno. (¡Algo salió mal con el Secret Manager!)");
        return null;
    }
    const emails = data.responsibleEmails;
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
                <!-- ICONO DE TAREA ASIGNADA DENTRO DEL H1 -->
                <h1 style="font-size: 24px; color: #333; margin-bottom: 10px;">
                    <img src="${ICONO_TAREA}" alt="Icono de tarea" style="vertical-align: middle; width: 28px; height: 28px; margin-right: 8px;">
                    ¡Nueva Tarea Asignada!
                </h1>
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    ¡Hola equipo! Se ha programado y asignado una nueva tarea en su **Planificador de Contenido**. ¡Manos a la obra!
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
                        IR A MIS TAREAS ASIGNADAS
                    </a>
                </div>

                <p style="font-size: 16px; color: #555; line-height: 1.6; margin-top: 20px;">
                    ¡Tu compromiso es clave para la Visión de la iglesia!
                </p>
            </td>
        </tr>

        <tr>
            <td align="center" style="padding: 20px 30px; border-top: 1px solid #ddd; background-color: ${LIGHT_GRAY}; border-radius: 0 0 8px 8px;">
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
    console.log("INTENTO DE ENVIO INICIADO a:", emails.join(","));
    try {
        await mailTransport.sendMail(mailOptions);
        console.log("Emails enviados exitosamente a:", emails.join(","));
    }
    catch (error) {
        console.error("Error al enviar email:", error);
    }
    return null;
});
//# sourceMappingURL=index.js.map