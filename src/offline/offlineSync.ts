import api from "../services/api";
import { getOfflineTests, deleteOfflineTest } from "./offlineStorage";
import type { OfflineTestRecord } from "./offlineStorage";

export async function syncOfflineTests(): Promise<number> {
  if (!navigator.onLine) {
    return 0;
  }

  const pendingTests: OfflineTestRecord[] =
    await getOfflineTests();

  let syncedCount = 0;

  for (const test of pendingTests) {
    try {
      await api.post("/sync/test-records", {
        records: [test],
      });

      await deleteOfflineTest(test.clientRecordId);

      syncedCount++;

    } catch (error) {
      console.error(
        `Failed to sync test ${test.clientRecordId}:`,
        error
      );
    }
  }

  return syncedCount;
}