import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

// Definición de la estructura de la tarea (para tipado en TS)
interface ContentData {
    type: string;
    platform: string;
    contentIdea: string;
    publishDate?: string;
    responsibleEmails: string[];
}

// Configuración de marca y URLs (Variables globales)
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/multimedia-logo.png?alt=media&token=376837ef-50fb-45ee-a1ca-90492ddefa0a";
const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';
const PANEL_URL = "https://adminmultimediavisionpentacostes.netlify.app/mi-contenido";
const ICONO_TAREA = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/tarea-asignada.png?alt=media&token=d4e21adc-5c7c-4868-8249-5d54b97249c1";
const PRIMARY_COLOR = "#3B82F6";
const LIGHT_GRAY = "#f0f0f0";

// ============================================================================
// 1. NUEVA FUNCIÓN PROGRAMADA: Crear Tarea de Versículos Semanal
// ============================================================================
// Se ejecuta automáticamente cada Lunes a las 08:00 AM (Hora Colombia)
export const createWeeklyVerseTask = onSchedule({
    schedule: "every monday 08:00", 
    timeZone: "America/Bogota", // CORREGIDO: timeZone (con Z mayúscula)
    secrets: ["SENDGRID_KEY"] 
}, async (event) => {
    const db = admin.firestore();
    console.log("Iniciando creación automática de tarea de versículos...");

    // 1. Correos de los responsables fijos para esta tarea
    const targetEmails = [
        "martinezrodelojose@gmail.com",
        "mpayaresosorio@gmail.com",
        "gomezpalominoleidys@gmail.com"
    ];

    // 2. Obtener los IDs de usuario correspondientes a esos correos
    let responsibleIds: string[] = [];
    try {
        // Firestore 'in' soporta hasta 10 valores
        const usersSnapshot = await db.collection("users").where("email", "in", targetEmails).get();
        responsibleIds = usersSnapshot.docs.map(doc => doc.id);
        console.log(`Usuarios encontrados: ${responsibleIds.length} de ${targetEmails.length}`);
    } catch (error) {
        console.error("Error buscando usuarios por email:", error);
    }

    // 3. Calcular la fecha de cierre (Domingo de esta semana)
    // Se crea el Lunes (Today), publishDate será el Domingo (Today + 6 días)
    const today = new Date(); 
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + 6); 
    const publishDateStr = sunday.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // 4. Crear la tarea en Firestore con el flag 'isGroupTask: true'
    try {
        await db.collection("contentSchedule").add({
            type: "Versículos Diarios",
            platform: ["Facebook", "WhatsApp"], // Array de plataformas
            recurrenceDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
            publishDate: publishDateStr,
            format: "Imagen",
            objective: "Alcanzar visitas a las páginas mediante versículos bíblicos",
            audience: "Seguidores, iglesia y comunidad en general",
            contentIdea: "Alcanzar visitas a las páginas mediante versículos bíblicos",
            responsibleIds: responsibleIds,
            responsibleEmails: targetEmails,
            status: "Planeado",
            
            // --- CAMPOS CLAVE PARA TU LÓGICA ---
            isGroupTask: true,        // ESTO MANTIENE LA TAREA GRUPAL (Estado compartido)
            individualStatus: {},     // Vacío porque es grupal
            isActive: true,
            
            createdAt: admin.firestore.Timestamp.now(),
            createdBy: "SYSTEM_SCHEDULED"
        });
        console.log("Tarea semanal de 'Versículos Diarios' creada exitosamente.");
    } catch (error) {
        console.error("Error creando la tarea automática:", error);
    }
});


// ============================================================================
// 2. FUNCIÓN DE NOTIFICACIONES (DISEÑO ORIGINAL)
// ============================================================================
// Se ejecuta cada vez que se crea un documento en 'contentSchedule'
export const onTaskCreatedSendNotifications = onDocumentCreated(
    {
        document: "contentSchedule/{contentId}",
        region: "us-central1",
        secrets: ["SENDGRID_KEY"]
    },
    async (event) => {

        const SENDGRID_API_KEY = process.env.SENDGRID_KEY; 

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
        const data = event.data.data() as ContentData;

        if (!data || !data.responsibleEmails || data.responsibleEmails.length === 0) {
            console.log("Función terminada: No hay correos responsables.");
            return null;
        }
        
        if (!SENDGRID_API_KEY) {
            console.error("Error: SENDGRID_KEY no está definida.");
            return null;
        }
        
        const emails = data.responsibleEmails;
        
        // DISEÑO ORIGINAL DEL CORREO
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
        } catch (error) {
            console.error("Error al enviar email:", error);
        }

        return null;
    });