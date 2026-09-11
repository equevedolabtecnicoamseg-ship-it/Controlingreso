import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const IMAGE_EXT = /\.(jpe?g|png|webp|bmp|tiff?)$/i;
const POLL_MS = 1200;

const DB_NAME = "am-seguridad-scanner";
const STORE = "handles";
const KEY = "scanner-folder";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export interface ScannerFolderState {
  supported: boolean;
  connected: boolean;
  /** Hay una carpeta recordada pero el navegador pide permiso de nuevo. */
  needsPermission: boolean;
  folderName: string | null;
  watching: boolean;
  connect: () => Promise<void>;
  /** Vuelve a pedir permiso sobre la carpeta recordada (requiere click). */
  resume: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Watches the folder where the document scanner (Plustek D620 / DocAction)
 * saves its scans and reports every new image file as it appears.
 * La carpeta elegida se recuerda para que el escáner quede activo solo.
 */
export function useScannerFolder(onNewFile: (file: File) => void): ScannerFolderState {
  const supported = typeof window !== "undefined" && "showDirectoryPicker" in window;
  const [folderName, setFolderName] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const dirRef = useRef<any>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const callbackRef = useRef(onNewFile);
  callbackRef.current = onNewFile;

  const scan = useCallback(async (emit: boolean) => {
    const dir = dirRef.current;
    if (!dir) return;
    try {
      const found: { key: string; file: File }[] = [];
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== "file" || !IMAGE_EXT.test(name)) continue;
        const file: File = await handle.getFile();
        const key = `${name}:${file.lastModified}:${file.size}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        if (emit) found.push({ key, file });
      }
      found
        .sort((a, b) => a.file.lastModified - b.file.lastModified)
        .forEach(({ file }) => callbackRef.current(file));
    } catch {
      // folder permission revoked or removed
      setWatching(false);
      setNeedsPermission(true);
    }
  }, []);

  const start = useCallback(async (dir: any, announce: boolean) => {
    dirRef.current = dir;
    seenRef.current = new Set();
    setFolderName(dir.name);
    setNeedsPermission(false);
    await scan(false); // ignore files that already existed
    setWatching(true);
    if (announce) toast.success(`Escáner conectado a "${dir.name}"`);
  }, [scan]);

  // Reconexión automática con la carpeta recordada
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void (async () => {
      const dir = await idbGet<any>();
      if (!dir || cancelled) return;
      setFolderName(dir.name);
      try {
        const state = await dir.queryPermission({ mode: "read" });
        if (state === "granted") await start(dir, false);
        else setNeedsPermission(true);
      } catch {
        setNeedsPermission(true);
      }
    })();
    return () => { cancelled = true; };
  }, [supported, start]);

  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => void scan(true), POLL_MS);
    return () => clearInterval(id);
  }, [watching, scan]);

  const connect = useCallback(async () => {
    if (!supported) {
      toast.error("Este navegador no permite leer carpetas. Usá Chrome o Edge en la PC.");
      return;
    }
    try {
      const dir = await (window as any).showDirectoryPicker({ id: KEY, mode: "read" });
      await idbSet(dir);
      await start(dir, true);
    } catch {
      // user cancelled the picker
    }
  }, [supported, start]);

  const resume = useCallback(async () => {
    const dir = dirRef.current ?? (await idbGet<any>());
    if (!dir) {
      await connect();
      return;
    }
    try {
      const ok = (await dir.requestPermission({ mode: "read" })) === "granted";
      if (ok) await start(dir, true);
      else toast.error("No se pudo habilitar la carpeta del escáner");
    } catch {
      await connect();
    }
  }, [connect, start]);

  const disconnect = useCallback(() => {
    dirRef.current = null;
    seenRef.current = new Set();
    setFolderName(null);
    setWatching(false);
    setNeedsPermission(false);
    void idbClear();
  }, []);

  return { supported, connected: watching, needsPermission, folderName, watching, connect, resume, disconnect };
}
