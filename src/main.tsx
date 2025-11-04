// functions/src/index.ts
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes"; // Importar

createRoot(document.getElementById("root")!).render(
  // Envolver App con ThemeProvider
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);


// Configuración del transportador de correo
const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;

const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// Función que se dispara cuando se CREA un nuevo documento en 'contentSchedule'
export const onContentCreated = functions
  .region("us-central1") // Asegúrate de que coincida con tu región de Firebase
  .firestore
  .document("contentSchedule/{contentId}")
  .onCreate(async (snap) => {
    const content = snap.data();

    if (!content) {
      console.log("No hay datos en el documento.");
      return;
    }

    const recipientEmail = content.responsibleEmail;
    const taskTitle = content.type;
    const contentIdea = content.contentIdea;

    const mailOptions = {
      from: `"Panel Multimedia" <${gmailEmail}>`,
      to: recipientEmail,
      subject: `¡Nueva asignación de contenido! - ${taskTitle}`,
      html: `
        <p>Hola,</p>
        <p>Se te ha asignado un nuevo contenido en el panel de Multimedia:</p>
        
        <div style="padding: 16px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <p><strong>Tipo:</strong> ${taskTitle}</p>
          <p><strong>Idea del Contenido:</strong> ${contentIdea}</p>
          <p><strong>Plataforma:</strong> ${content.platform}</p>
          <p><strong>Fecha de Publicación:</strong> ${content.publishDate || "No definida"}</p>
        </div>
        
        <p>Puedes ver y actualizar el estado de esta tarea en el panel:</p>
        <a href="URL_DE_TU_APP_WEB" style="padding: 12px 20px; background-color: #6a1b9a; color: white; text-decoration: none; border-radius: 5px;">Ir al Panel</a>
        <br>
        <p>¡Dios te bendiga!</p>
      `,
    };

    try {
      await mailTransport.sendMail(mailOptions);
      console.log(`Correo enviado a: ${recipientEmail}`);
    } catch (error) {
      console.error("Hubo un error al enviar el correo:", error);
    }
  });