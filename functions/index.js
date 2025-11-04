// functions/index.js
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// ¡Importante! Esto carga tu archivo .env
require("dotenv").config();

// Leer desde process.env (el archivo .env)
const gmailEmail = process.env.GMAIL_EMAIL;
const gmailPassword = process.env.GMAIL_PASSWORD;

const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

// Función que se dispara cuando se CREA un nuevo documento en 'contentSchedule'
exports.onContentCreated = functions
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
        <a href="https://adminmultimediavisionpentacostes.netlify.app/" style="padding: 12px 20px; background-color: #6a1b9a; color: white; text-decoration: none; border-radius: 5px;">Ir al Panel</a>
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