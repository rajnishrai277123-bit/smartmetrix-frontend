import { syncOfflineTests } from "./offlineSync";

export function registerOfflineSync() {
  window.addEventListener("online", async () => {
    console.log("Internet restored. Syncing offline records...");

    const count = await syncOfflineTests();

    console.log(`${count} offline record(s) synced.`);
  });
}