/**
 * Archivo local "FOTOS DE INGRESOS":
 * guarda, por cada persona, una subcarpeta con las 2 fotos del DNI,
 * la foto de la webcam y un TXT con sus datos.
 *
 * Usa la File System Access API (Chrome/Edge de escritorio) y recuerda la
 * carpeta elegida en IndexedDB para no volver a pedirla en cada sesión.
 */

const DB_NAME = "am-seguridad-archive";
const STORE = "handles";
const KEY = "fotos-de-ingresos";

export const ARCHIVE_FOLDER_NAME = "FOTOS DE INGRESOS";

export const isLocalArchiveSupported = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

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

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Pide la carpeta base (por defecto arranca en el Escritorio) y la recuerda.
 * Si el usuario elige el Escritorio, la carpeta "FOTOS DE INGRESOS" se crea sola
 * en el primer ingreso. Si elige directamente esa carpeta, se usa tal cual.
 */
export async function pickArchiveFolder(): Promise<{ name: string } | null> {
  if (!isLocalArchiveSupported()) return null;
  const handle = await (window as any).showDirectoryPicker({
    id: KEY,
    mode: "readwrite",
    startIn: "desktop",
  });
  await idbSet(KEY, handle);
  const dir = await resolveArchiveDir(handle);
  return { name: dir?.name ?? handle.name };
}

/**
 * Devuelve (creándola si hace falta) la carpeta "FOTOS DE INGRESOS".
 * Si el handle guardado ya es esa carpeta, se devuelve directamente.
 */
async function resolveArchiveDir(base: any): Promise<any | null> {
  if (!base) return null;
  if (String(base.name).trim().toUpperCase() === ARCHIVE_FOLDER_NAME) return base;
  try {
    return await base.getDirectoryHandle(ARCHIVE_FOLDER_NAME, { create: true });
  } catch {
    return null;
  }
}

export async function getSavedArchiveFolder(): Promise<{ name: string; granted: boolean } | null> {
  if (!isLocalArchiveSupported()) return null;
  const handle = await idbGet<any>(KEY);
  if (!handle) return null;
  const state = await handle.queryPermission({ mode: "readwrite" });
  const name =
    String(handle.name).trim().toUpperCase() === ARCHIVE_FOLDER_NAME
      ? handle.name
      : `${handle.name} / ${ARCHIVE_FOLDER_NAME}`;
  return { name, granted: state === "granted" };
}

/** Vuelve a pedir permiso sobre la carpeta guardada (requiere un click del usuario). */
export async function ensureArchivePermission(): Promise<boolean> {
  const handle = await idbGet<any>(KEY);
  if (!handle) return false;
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function forgetArchiveFolder(): Promise<void> {
  await idbDelete(KEY);
}

function sanitize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 80) || "SIN NOMBRE";
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`;
}

function base64ToBlob(base64: string, type = "image/jpeg"): Blob {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = atob(clean);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

export interface LocalArchiveEntry {
  fullName: string;
  dniNumber?: string;
  company?: string;
  reason?: string;
  personToVisit?: string;
  sectorName?: string;
  qrLabel?: string;
  dniFrontBase64?: string | null;
  dniBackBase64?: string | null;
  photoBase64?: string | null;
}

/**
 * Crea/usa la subcarpeta de la persona dentro de "FOTOS DE INGRESOS"
 * y escribe las fotos + el TXT de datos de este ingreso.
 */
export async function saveEntryToLocalArchive(entry: LocalArchiveEntry): Promise<boolean> {
  let base = await idbGet<any>(KEY);
  if (!base) {
    // Primera vez: pedimos la carpeta una única vez y se recuerda para siempre.
    try {
      await pickArchiveFolder();
    } catch {
      return false;
    }
    base = await idbGet<any>(KEY);
    if (!base) return false;
  }
  if (!(await ensureArchivePermission())) return false;
  const root = await resolveArchiveDir(base);
  if (!root) return false;

  const now = new Date();
  const folderName = entry.dniNumber
    ? `${sanitize(entry.fullName)} - ${entry.dniNumber}`
    : sanitize(entry.fullName);
  const personDir = await root.getDirectoryHandle(folderName, { create: true });
  const prefix = stamp(now);

  const write = async (name: string, data: Blob) => {
    const fileHandle = await personDir.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  };

  if (entry.dniFrontBase64) await write(`${prefix}_dni-frente.jpg`, base64ToBlob(entry.dniFrontBase64));
  if (entry.dniBackBase64) await write(`${prefix}_dni-dorso.jpg`, base64ToBlob(entry.dniBackBase64));
  if (entry.photoBase64) await write(`${prefix}_foto-persona.jpg`, base64ToBlob(entry.photoBase64));

  const lines = [
    "AM SEGURIDAD - REGISTRO DE INGRESO",
    "===================================",
    `Nombre y apellido : ${entry.fullName}`,
    `DNI               : ${entry.dniNumber || "-"}`,
    `Fecha y hora      : ${now.toLocaleString("es-AR")}`,
    `Objetivo / sector : ${entry.sectorName || "-"}`,
    `QR asignado       : ${entry.qrLabel || "-"}`,
    `Empresa           : ${entry.company || "-"}`,
    `Persona a visitar : ${entry.personToVisit || "-"}`,
    `Motivo            : ${entry.reason || "-"}`,
    "",
    "Archivos de este ingreso:",
    `- ${prefix}_dni-frente.jpg`,
    `- ${prefix}_dni-dorso.jpg`,
    `- ${prefix}_foto-persona.jpg`,
    "",
  ].join("\r\n");

  await write(`${prefix}_datos.txt`, new Blob([lines], { type: "text/plain;charset=utf-8" }));
  return true;
}
