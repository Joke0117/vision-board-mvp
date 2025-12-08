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
exports.generateMonthlyRanking = exports.onTaskCreatedSendNotifications = exports.createWeeklyVerseTask = void 0;
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
admin.initializeApp();
// Configuración de marca y URLs (Variables globales)
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/multimedia-logo.png?alt=media&token=376837ef-50fb-45ee-a1ca-90492ddefa0a";
const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';
const PANEL_URL = "https://adminmultimediavisionpentacostes.netlify.app/mi-contenido";
const ICONO_TAREA = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/tarea-asignada.png?alt=media&token=d4e21adc-5c7c-4868-8249-5d54b97249c1";
const PRIMARY_COLOR = "#3B82F6";
const LIGHT_GRAY = "#f0f0f0";
// ============================================================================
// 1. FUNCIÓN PROGRAMADA: Crear Tarea de Versículos Semanal
// ============================================================================
// Se ejecuta automáticamente cada Lunes a las 08:00 AM (Hora Colombia)
exports.createWeeklyVerseTask = (0, scheduler_1.onSchedule)({
    schedule: "every monday 08:00",
    timeZone: "America/Bogota",
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
    let responsibleIds = [];
    try {
        // Firestore 'in' soporta hasta 10 valores
        const usersSnapshot = await db.collection("users").where("email", "in", targetEmails).get();
        responsibleIds = usersSnapshot.docs.map(doc => doc.id);
        console.log(`Usuarios encontrados: ${responsibleIds.length} de ${targetEmails.length}`);
    }
    catch (error) {
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
            // --- CAMPOS CLAVE PARA LÓGICA DE RANKING ---
            isGroupTask: true, // ESTO MANTIENE LA TAREA GRUPAL (Estado compartido)
            individualStatus: {}, // Vacío porque es grupal
            isActive: true,
            createdAt: admin.firestore.Timestamp.now(),
            createdBy: "SYSTEM_SCHEDULED"
        });
        console.log("Tarea semanal de 'Versículos Diarios' creada exitosamente.");
    }
    catch (error) {
        console.error("Error creando la tarea automática:", error);
    }
});
// ============================================================================
// 2. FUNCIÓN DE NOTIFICACIONES
// ============================================================================
// Se ejecuta cada vez que se crea un documento en 'contentSchedule'
exports.onTaskCreatedSendNotifications = (0, firestore_1.onDocumentCreated)({
    document: "contentSchedule/{contentId}",
    region: "us-central1",
    secrets: ["SENDGRID_KEY"]
}, async (event) => {
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
    const data = event.data.data();
    if (!data || !data.responsibleEmails || data.responsibleEmails.length === 0) {
        console.log("Función terminada: No hay correos responsables.");
        return null;
    }
    if (!SENDGRID_API_KEY) {
        console.error("Error: SENDGRID_KEY no está definida.");
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
// ============================================================================
// 3. GENERADOR DE RANKING MENSUAL (HISTORIAL)
// ============================================================================
// Se ejecuta el día 1 de cada mes a las 00:01 AM para cerrar el mes anterior
exports.generateMonthlyRanking = (0, scheduler_1.onSchedule)({
    schedule: "1 of month 00:01",
    timeZone: "America/Bogota",
}, async (event) => {
    const db = admin.firestore();
    console.log("Generando ranking mensual...");
    // 1. Definir el rango del mes ANTERIOR
    const now = new Date();
    // Vamos al mes anterior (si hoy es 1 de Nov, queremos stats de Oct)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    try {
        // 2. Obtener tareas y usuarios
        const [contentSnap, usersSnap] = await Promise.all([
            db.collection("contentSchedule").where("isActive", "==", true).get(),
            db.collection("users").get()
        ]);
        const users = usersSnap.docs.map(doc => ({ id: doc.id, email: doc.data().email }));
        // CORRECCIÓN: Usamos 'as TaskData' en lugar de 'as any'.
        // Al quitar [key: string]: any de la interfaz, el linter ya no se queja.
        const tasks = contentSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // 3. Calcular puntajes
        const scores = users.map(user => {
            // Filtrar tareas de este usuario
            const userTasks = tasks.filter(t => {
                if (!t.responsibleIds || !t.responsibleIds.includes(user.id))
                    return false;
                // Verificar si cae en el mes anterior
                // A) Si tiene fecha de publicación
                if (t.publishDate) {
                    const pDate = new Date(t.publishDate);
                    // Ajuste zona horaria simple o comparación directa UTC
                    return pDate >= startOfPrevMonth && pDate <= endOfPrevMonth;
                }
                // B) Si es recurrente (cuenta para todos los meses mientras esté activa)
                if (t.recurrenceDays && t.recurrenceDays.length > 0) {
                    // Opcional: Podrías filtrar por fecha de creación si quieres
                    return true;
                }
                return false;
            });
            const total = userTasks.length;
            if (total === 0)
                return Object.assign(Object.assign({}, user), { score: 0 });
            // Contar completadas (Manejo de estado individual o grupal)
            const completed = userTasks.filter(t => {
                let status = t.status; // Estado global por defecto
                // Si tiene estado individual y no es tarea grupal, usar ese
                if (!t.isGroupTask && t.individualStatus && t.individualStatus[user.id]) {
                    status = t.individualStatus[user.id];
                }
                return status === "Publicado";
            }).length;
            // Fórmula: (Completadas / Total) * 5
            const score = (completed / total) * 5;
            return Object.assign(Object.assign({}, user), { score });
        });
        // 4. Ordenar y obtener Top 3 (Solo scores >= 3.0 para calidad)
        const rankedUsers = scores
            .filter(u => u.score >= 0.1) // Filtrar inactivos absolutos
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((u, index) => ({
            rank: index + 1,
            userId: u.id,
            email: u.email,
            score: u.score
        }));
        if (rankedUsers.length === 0) {
            console.log("No hubo actividad suficiente para generar ranking.");
            return;
        }
        // 5. Guardar en colección 'monthlyRankings'
        const monthName = startOfPrevMonth.toLocaleString('es-ES', { month: 'long' });
        const year = startOfPrevMonth.getFullYear();
        await db.collection("monthlyRankings").add({
            month: monthName,
            year: year,
            dateProcessed: admin.firestore.Timestamp.now(),
            topUsers: rankedUsers,
            title: `Top 3 - ${monthName} ${year}` // Para facilitar visualización
        });
        console.log(`Ranking de ${monthName} generado exitosamente.`);
    }
    catch (error) {
        console.error("Error generando ranking:", error);
    }
});
//# sourceMappingURL=index.js.map