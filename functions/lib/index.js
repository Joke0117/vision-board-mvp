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
exports.triggerManualRanking = exports.generateMonthlyRanking = exports.onTaskCreatedSendNotifications = exports.createWeeklyVerseTask = void 0;
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https"); // Importante para el disparador manual
admin.initializeApp();
// --- CONFIGURACIÓN Y CONSTANTES ---
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/multimedia-logo.png?alt=media&token=376837ef-50fb-45ee-a1ca-90492ddefa0a";
const FROM_EMAIL = '"Multimedia Visión Pentecostés" <notificaciones@multidiavisionpentecostes.online>';
const PANEL_URL = "https://adminmultimediavisionpentacostes.netlify.app/mi-contenido";
const ICONO_TAREA = "https://firebasestorage.googleapis.com/v0/b/multimedia-icvp.firebasestorage.app/o/tarea-asignada.png?alt=media&token=d4e21adc-5c7c-4868-8249-5d54b97249c1";
const PRIMARY_COLOR = "#3B82F6";
const LIGHT_GRAY = "#f0f0f0";
// ============================================================================
// 1. FUNCIÓN PROGRAMADA: Crear Tarea de Versículos Semanal
// ============================================================================
exports.createWeeklyVerseTask = (0, scheduler_1.onSchedule)({
    schedule: "every monday 08:00",
    timeZone: "America/Bogota",
    secrets: ["SENDGRID_KEY"]
}, async (event) => {
    const db = admin.firestore();
    console.log("Iniciando creación automática de tarea de versículos...");
    const targetEmails = [
        "martinezrodelojose@gmail.com",
        "mpayaresosorio@gmail.com",
        "gomezpalominoleidys@gmail.com"
    ];
    let responsibleIds = [];
    try {
        const usersSnapshot = await db.collection("users").where("email", "in", targetEmails).get();
        responsibleIds = usersSnapshot.docs.map(doc => doc.id);
    }
    catch (error) {
        console.error("Error buscando usuarios por email:", error);
    }
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + 6);
    const publishDateStr = sunday.toISOString().split('T')[0];
    try {
        await db.collection("contentSchedule").add({
            type: "Versículos Diarios",
            platform: ["Facebook", "WhatsApp"],
            recurrenceDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
            publishDate: publishDateStr,
            format: "Imagen",
            objective: "Alcanzar visitas a las páginas mediante versículos bíblicos",
            audience: "Seguidores, iglesia y comunidad en general",
            contentIdea: "Alcanzar visitas a las páginas mediante versículos bíblicos",
            responsibleIds: responsibleIds,
            responsibleEmails: targetEmails,
            status: "Planeado",
            isGroupTask: true,
            individualStatus: {},
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
exports.onTaskCreatedSendNotifications = (0, firestore_1.onDocumentCreated)({
    document: "contentSchedule/{contentId}",
    region: "us-central1",
    secrets: ["SENDGRID_KEY"]
}, async (event) => {
    const SENDGRID_API_KEY = process.env.SENDGRID_KEY;
    const mailTransport = nodemailer.createTransport({
        service: "SendGrid",
        auth: { user: "apikey", pass: SENDGRID_API_KEY },
    });
    if (!event.data)
        return null;
    const data = event.data.data();
    if (!data || !data.responsibleEmails || data.responsibleEmails.length === 0)
        return null;
    if (!SENDGRID_API_KEY)
        return null;
    const emails = data.responsibleEmails;
    const mailOptions = {
        from: FROM_EMAIL,
        to: emails.join(","),
        subject: `¡Nueva Tarea Asignada!: ${data.type}`,
        html: `
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <table width="100%" max-width="600px" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <tr><td align="center" style="padding: 20px 30px;"><img src="${LOGO_URL}" alt="Logo Multimedia" style="width: 100px; height: auto;"></td></tr>
        <tr>
            <td style="padding: 10px 30px 20px 30px;">
                <h1 style="font-size: 24px; color: #333; margin-bottom: 10px;">
                    <img src="${ICONO_TAREA}" alt="Icono de tarea" style="vertical-align: middle; width: 28px; height: 28px; margin-right: 8px;">
                    ¡Nueva Tarea Asignada!
                </h1>
                <p style="font-size: 16px; color: #555; line-height: 1.6;">¡Hola equipo! Se ha programado una nueva tarea.</p>
                <div style="background-color: ${LIGHT_GRAY}; border-left: 4px solid ${PRIMARY_COLOR}; border-radius: 5px; padding: 15px; margin-top: 25px;">
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Tipo:</strong> ${data.type}</p>
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Plataforma:</strong> ${Array.isArray(data.platform) ? data.platform.join(", ") : data.platform}</p>
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Fecha:</strong> ${data.publishDate || "N/A"}</p>
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Detalle:</strong> ${data.contentIdea}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${PANEL_URL}" target="_blank" style="background-color: ${PRIMARY_COLOR}; color: #ffffff; padding: 15px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">IR A MIS TAREAS</a>
                </div>
            </td>
        </tr>
    </table>
</body>`,
    };
    try {
        await mailTransport.sendMail(mailOptions);
    }
    catch (error) {
        console.error("Error al enviar email:", error);
    }
    return null;
});
// ============================================================================
// LOGICA CENTRAL DEL RANKING (Compartida)
// ============================================================================
const generateRankingLogic = async (isManual = false) => {
    const db = admin.firestore();
    console.log(`Generando ranking mensual... (Modo Manual: ${isManual})`);
    const now = new Date();
    // Lógica por defecto: Cierra el mes inmediatamente anterior al actual.
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    console.log(`Analizando rango: ${startOfPrevMonth.toISOString()} - ${endOfPrevMonth.toISOString()}`);
    try {
        const [contentSnap, usersSnap] = await Promise.all([
            db.collection("contentSchedule").where("isActive", "==", true).get(),
            db.collection("users").get()
        ]);
        const users = usersSnap.docs.map(doc => ({ id: doc.id, email: doc.data().email }));
        // CORRECCIÓN: Usamos la interfaz TaskData en lugar de 'any' para evitar el error de lint
        const tasks = contentSnap.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const scores = users.map(user => {
            const userTasks = tasks.filter(t => {
                if (!t.responsibleIds || !t.responsibleIds.includes(user.id))
                    return false;
                // Verificar si cae en el rango del mes
                if (t.publishDate) {
                    const pDate = new Date(t.publishDate);
                    return pDate >= startOfPrevMonth && pDate <= endOfPrevMonth;
                }
                // Si es recurrente, asumimos que cuenta si existe
                if (t.recurrenceDays && t.recurrenceDays.length > 0) {
                    return true;
                }
                return false;
            });
            const total = userTasks.length;
            if (total === 0)
                return Object.assign(Object.assign({}, user), { score: 0 });
            const completed = userTasks.filter(t => {
                let status = t.status;
                if (!t.isGroupTask && t.individualStatus && t.individualStatus[user.id]) {
                    status = t.individualStatus[user.id];
                }
                return status === "Publicado";
            }).length;
            const score = (completed / total) * 5;
            return Object.assign(Object.assign({}, user), { score });
        });
        const rankedUsers = scores
            .filter(u => u.score >= 0.1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map((u, index) => ({
            rank: index + 1,
            userId: u.id,
            email: u.email,
            score: u.score
        }));
        if (rankedUsers.length === 0) {
            console.log("No hubo actividad suficiente.");
            return { success: false, message: "No hubo actividad suficiente para generar ranking." };
        }
        const monthName = startOfPrevMonth.toLocaleString('es-ES', { month: 'long' });
        const year = startOfPrevMonth.getFullYear();
        await db.collection("monthlyRankings").add({
            month: monthName,
            year: year,
            dateProcessed: admin.firestore.Timestamp.now(),
            topUsers: rankedUsers,
            title: `Top 3 - ${monthName} ${year}`
        });
        console.log(`Ranking generado: ${monthName} ${year}`);
        return { success: true, message: `Ranking de ${monthName} generado con éxito. Top 1: ${rankedUsers[0].email}` };
    }
    catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
// ============================================================================
// 3. GENERADOR DE RANKING MENSUAL (AUTOMÁTICO)
// ============================================================================
exports.generateMonthlyRanking = (0, scheduler_1.onSchedule)({
    schedule: "1 of month 00:01",
    timeZone: "America/Bogota",
}, async (event) => {
    await generateRankingLogic(false);
});
// ============================================================================
// 4. GENERADOR DE RANKING MENSUAL (MANUAL - HTTP)
// ============================================================================
exports.triggerManualRanking = (0, https_1.onRequest)(async (req, res) => {
    try {
        const result = await generateRankingLogic(true);
        res.status(200).send(result.message);
    }
    catch (error) {
        res.status(500).send("Error interno generando ranking: " + error);
    }
});
//# sourceMappingURL=index.js.map