import { useCallback, useEffect, useRef, useState } from "react";

const BRIDGE_URL = "http://localhost:7777";
const POLL_MS = 1200;

export interface ScannerBridgeState {
  /** El programita local está corriendo en esta PC. */
  available: boolean;
  scanning: boolean;
  /** El escáner detecta un documento apoyado en el alimentador. */
  paperPresent: boolean;
  /** Dispara el escaneo dúplex y devuelve las caras en base64 (sin prefijo data:). */
  scan: () => Promise<string[]>;
  helperUrl: string;
}

/**
 * Puente con el programita local "escaner-am" que ordena al escáner
 * (Plustek D620) hacer girar el rodillo y devuelve las 2 caras del DNI.
 * También consulta si hay un documento apoyado para escanear solo.
 */
export function useScannerBridge(): ScannerBridgeState {
  const [available, setAvailable] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [paperPresent, setPaperPresent] = useState(false);
  const scanningRef = useRef(false);

  const poll = useCallback(async () => {
    if (scanningRef.current) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${BRIDGE_URL}/status`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("bridge");
      const data = await res.json();
      setAvailable(true);
      setPaperPresent(Boolean(data?.paperPresent));
    } catch {
      setAvailable(false);
      setPaperPresent(false);
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const scan = useCallback(async (): Promise<string[]> => {
    scanningRef.current = true;
    setScanning(true);
    setPaperPresent(false);
    try {
      const res = await fetch(`${BRIDGE_URL}/scan`);
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "El escáner no pudo completar el escaneo");
      return (data.images as string[]) ?? [];
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  return { available, scanning, paperPresent, scan, helperUrl: "/escaner-am.zip" };
}
