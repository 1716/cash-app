import dotenv from "dotenv";
dotenv.config();
console.log("FIREBASE_SERVICE_ACCOUNT exists:", !!process.env.FIREBASE_SERVICE_ACCOUNT);
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("Project ID in cert:", cert.project_id);
  } catch (e) {
    console.log("Error parsing cert:", e.message);
  }
}
