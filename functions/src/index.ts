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

// NUEVA INTERFAZ: Definición para el Ranking (Corregida sin 'any')
interface TaskData {
    id: string;
    responsibleIds?: string[];
    publishDate?: string;
    recurrenceDays?: string[];
    status?: string;
    isGroupTask?: boolean;
    individualStatus?: Record<string, string>;
}

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
export const createWeeklyVerseTask = onSchedule({
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
            
            // --- CAMPOS CLAVE PARA LÓGICA DE RANKING ---
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
// 2. FUNCIÓN DE NOTIFICACIONES
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

// ============================================================================
// 3. GENERADOR DE RANKING MENSUAL (HISTORIAL)
// ============================================================================
// Se ejecuta el día 1 de cada mes a las 00:01 AM para cerrar el mes anterior
export const generateMonthlyRanking = onSchedule({
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
        const tasks = contentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskData));

        // 3. Calcular puntajes
        const scores = users.map(user => {
            // Filtrar tareas de este usuario
            const userTasks = tasks.filter(t => {
                if (!t.responsibleIds || !t.responsibleIds.includes(user.id)) return false;

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
            if (total === 0) return { ...user, score: 0 };

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
            return { ...user, score };
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

    } catch (error) {
        console.error("Error generando ranking:", error);
    }
});


// ============================================================================
// 4. GENERADORES DE INFORMES (SEMANAL, MENSUAL, ANUAL) - NUEVO CÓDIGO AÑADIDO
// ============================================================================

// NUEVA INTERFAZ: Estructura para las estadísticas del reporte (Evita error 'any')
interface ReportStats {
    total: number;
    completed: number;
    pending: number;
    efficiency: number;
}

// A. Plantilla HTML Estilo Certificado (Usando ReportStats)
const generateReportHtml = (userName: string, dateRange: string, stats: ReportStats, reportType: string) => {
    let title = "";
    let color = "#3B82F6"; 

    switch (reportType) {
        case "semanal":
            title = "INFORME SEMANAL DE DESEMPEÑO";
            break;
        case "mensual":
            title = "INFORME MENSUAL DE GESTIÓN";
            break;
        case "anual":
            title = "CERTIFICADO ANUAL DE SERVICIO";
            color = "#D97706";
            break;
    }

    const currentDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
    <body style="font-family: 'Times New Roman', Times, serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; padding: 60px 50px; border: 1px solid #d1d1d1; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #000;">
            <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 1px; color: #1F2937;">MULTIMEDIA</h2>
                <h3 style="margin: 5px 0 0 0; font-size: 14px; font-weight: normal; color: #555;">CENTRO CRISTIANO VISIÓN PENTECOSTÉS</h3>
            </div>
            <div style="text-align: right; margin-bottom: 40px; font-size: 14px;">Barranquilla, ${currentDate}</div>
            <div style="margin-bottom: 20px; font-size: 16px; font-weight: bold; border-bottom: 2px solid ${color}; display: inline-block; padding-bottom: 5px;">${title}</div>
            <div style="font-size: 16px; line-height: 1.6; text-align: justify; margin-bottom: 30px;">
                <p>A QUIEN CORRESPONDA:</p>
                <p>Por medio de la presente hago constar que <strong>${userName}</strong> ha prestado sus servicios y talentos en el equipo de Multimedia durante el periodo comprendido del <strong>${dateRange}</strong>.</p>
                <p>
                    ${reportType === 'anual' 
                        ? "A lo largo de este año, su constancia y dedicación se han reflejado en las siguientes métricas consolidadas:" 
                        : "Durante este tiempo, su gestión se resume en las siguientes estadísticas de rendimiento:"}
                </p>
                <ul style="list-style-type: none; padding: 20px; background-color: #f9f9f9; border-left: 4px solid ${color}; margin: 20px 0;">
                    <li style="margin-bottom: 10px;">• <strong>Total Tareas Asignadas:</strong> ${stats.total}</li>
                    <li style="margin-bottom: 10px;">• <strong>Tareas Completadas:</strong> ${stats.completed}</li>
                    <li style="margin-bottom: 10px;">• <strong>Tareas Pendientes:</strong> ${stats.pending}</li>
                    <li style="margin-bottom: 10px;">• <strong>Efectividad:</strong> ${stats.efficiency}%</li>
                </ul>
                <p>
                    ${stats.efficiency >= 80 
                        ? `Reconocemos su excelencia y compromiso inquebrantable, siendo un pilar fundamental para el ministerio.` 
                        : "Agradecemos su esfuerzo y le animamos a iniciar el próximo periodo con renovadas fuerzas y mayor organización."}
                </p>
                <p>Se expide el presente documento para fines informativos, de reconocimiento y de seguimiento ministerial en la plataforma.</p>
            </div>
            <div style="margin-top: 60px; margin-bottom: 40px;">
                <div style="width: 250px; border-top: 1px solid #000; padding-top: 10px;">
                    <p style="margin: 0; font-weight: bold; font-size: 16px;">Dirección General</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Ministerio Multimedia</p>
                </div>
            </div>
            <div style="border-top: 2px solid #E5E7EB; padding-top: 15px; text-align: center; font-size: 12px; color: #666; margin-top: 50px;">
                <p style="margin: 0;">www.visionpentecostes.org | contacto@visionpentecostes.org</p>
            </div>
        </div>
    </body>`;
};

// B. Lógica Centralizada de Procesamiento
async function processReports(period: 'semanal' | 'mensual' | 'anual') {
    const db = admin.firestore();
    const today = new Date();
    
    let startDate = new Date();
    let endDate = new Date();
    
    if (period === 'semanal') {
        startDate.setDate(today.getDate() - 7); 
        endDate.setDate(today.getDate() - 1);
    } else if (period === 'mensual') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (period === 'anual') {
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
    }
    
    const dateRangeStr = `${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`;
    console.log(`Generando reporte ${period}: ${dateRangeStr}`);

    const SENDGRID_API_KEY = process.env.SENDGRID_KEY;
    const mailTransport = nodemailer.createTransport({
        service: "SendGrid",
        auth: { user: "apikey", pass: SENDGRID_API_KEY },
    });

    try {
        const [usersSnap, tasksSnap] = await Promise.all([
            db.collection("users").get(),
            db.collection("contentSchedule").get() 
        ]);

        const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskData));

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const userEmail = userData.email;
            const userName = userData.name || "Miembro del Equipo";

            if (!userEmail) continue;

            const userTasks = tasks.filter(t => {
                if (!t.responsibleIds || !t.responsibleIds.includes(userId)) return false;
                if (t.publishDate) {
                    const pDate = new Date(t.publishDate);
                    return pDate >= startDate && pDate <= endDate;
                }
                if (t.recurrenceDays && t.recurrenceDays.length > 0) return true; 
                return false;
            });

            const total = userTasks.length;
            if (total === 0 && period === 'semanal') continue;

            const completed = userTasks.filter(t => {
                let status = t.status;
                if (!t.isGroupTask && t.individualStatus && t.individualStatus[userId]) {
                    status = t.individualStatus[userId];
                }
                return status === "Publicado";
            }).length;

            const pending = total - completed;
            const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

            const stats: ReportStats = { total, completed, pending, efficiency };

            await db.collection("userReports").add({
                userId,
                userName,
                type: period,
                dateRange: dateRangeStr,
                createdAt: admin.firestore.Timestamp.now(),
                stats,
                read: false
            });

            let subject = `📄 Tu Constancia de Desempeño ${period.charAt(0).toUpperCase() + period.slice(1)}`;
            if (period === 'anual') subject = `🏆 Certificado Anual de Servicio ${startDate.getFullYear()}`;

            const htmlContent = generateReportHtml(userName, dateRangeStr, stats, period);
            
            if (SENDGRID_API_KEY) {
                await mailTransport.sendMail({
                    from: FROM_EMAIL,
                    to: userEmail,
                    subject: subject,
                    html: htmlContent
                });
                console.log(`Reporte ${period} enviado a ${userEmail}`);
            }
        }
    } catch (error) {
        console.error("Error generando reportes:", error);
    }
}

// C. Triggers Programados
export const generateWeeklyReport = onSchedule({
    schedule: "every monday 06:00",
    timeZone: "America/Bogota",
    secrets: ["SENDGRID_KEY"]
}, async () => processReports('semanal'));

export const generateMonthlyReport = onSchedule({
    schedule: "1 of month 07:00",
    timeZone: "America/Bogota",
    secrets: ["SENDGRID_KEY"]
}, async () => processReports('mensual'));

export const generateAnnualReport = onSchedule({
    schedule: "1 of jan 08:00",
    timeZone: "America/Bogota",
    secrets: ["SENDGRID_KEY"]
}, async () => processReports('anual'));