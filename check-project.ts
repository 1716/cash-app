import { GoogleAuth } from "google-auth-library";
async function check() {
  const auth = new GoogleAuth();
  const projectId = await auth.getProjectId();
  console.log("Current Project ID:", projectId);
}
check();
