// test-cloud-trigger.js
const admin = require("firebase-admin");

// Apunta a la llave que acabas de descargar
const serviceAccount = require("./serviceAccountKey.json");

// Inicializa la app de admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Asegúrate que la URL sea la de tu proyecto
    databaseURL: "https://multimedia-icvp.firebaseio.com" 
  });
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error("Error inicializando app:", error);
  }
}

const db = admin.firestore();

// --- ¡Configura tu tarea de prueba aquí! ---
const TAREA_DE_PRUEBA = {
  type: "Video Test",
  platform: "Script (Test)",
  contentIdea: "Probando el trigger de la nube",
  publishDate: new Date().toISOString().split('T')[0], // Fecha de hoy
  status: "pending",
  responsibleEmails: [
    "martinezrodelojose@gmail.com", // <-- PON TU CORREO PARA VER SI LLEGA
    "mrodelo05@gmail.com"
  ]
};
// ------------------------------------------

async function runCloudTest() {
  try {
    console.log("Intentando escribir en Firestore (Nube)...");
    
    // Escribe el documento en la colección
    const docRef = await db.collection("contentSchedule").add(TAREA_DE_PRUEBA);
    
    console.log(`\n¡ÉXITO! Documento creado con ID: ${docRef.id}`);
    console.log("-----------------------------------------------");
    console.log("Tu función 'onTaskCreatedSendNotifications' debería dispararse ahora.");
    console.log("\nRevisa tu correo en 1 minuto...");
    console.log("Si no llega, revisa los 'Registros (Logs)' en la Consola de Firebase.");

  } catch (error) {
    console.error("\n¡ERROR! No se pudo escribir en Firestore:");
    console.error(error);
  }
}

runCloudTest();