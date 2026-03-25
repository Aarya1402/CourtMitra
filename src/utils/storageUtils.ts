// Simple IndexedDB wrapper for persisting thread state

const DB_NAME = "TalkumentStateDB";
const STORE_NAME = "ThreadStateStore";
const DB_VERSION = 1;

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveThreadState(
  threadId: string,
  state: any
): Promise<void> {
  if (!threadId) return;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(state, threadId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadThreadState(threadId: string): Promise<any> {
  if (!threadId) return null;
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(threadId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
