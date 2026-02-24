let initialized = false;

export async function initializeApp() {
  if (initialized) return;
  initialized = true;
  try {
    const res = await fetch("/api/init", { method: "POST" });
    const data = await res.json();
    console.log("App initialization:", data.status || data.error);
  } catch (e) {
    console.error("Init failed:", e);
  }
}
