export const SECTORS = [
  "RRHH",
  "OPERACIONES",
  "ELECTRONICA",
  "MONITOREO",
  "TESORERIA",
  "COMERCIAL",
] as const;

export type Sector = (typeof SECTORS)[number];
export type EmployeeStatus = "NO_INGRESO" | "PRESENTE" | "ALMUERZO" | "COMISION" | "EGRESADO";
export type MovementType =
  | "INGRESO"
  | "EGRESO"
  | "ALMUERZO_SALIDA"
  | "ALMUERZO_REGRESO"
  | "COMISION_SALIDA"
  | "COMISION_REGRESO"
  | "OTRA_SALIDA"
  | "OTRA_REGRESO";

export interface Employee {
  id: string;
  legajo: string;
  dni: string;
  name: string;
  sector: Sector;
  jefe: string;
}

export interface Movement {
  id: string;
  employeeId: string;
  type: MovementType;
  timestamp: string;
  reason?: string;
  authorizedBy?: string;
}

export interface VisitCredential {
  code: string;
  occupied: boolean;
  visitorName?: string;
  dni?: string;
  company?: string;
  destination?: string;
  reason?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface AccessState {
  employees: Employee[];
  movements: Movement[];
  visits: VisitCredential[];
}

export interface DelayInfo {
  level: "NORMAL" | "LEVE" | "IMPORTANTE" | "SIN_INGRESO";
  label: string;
  className: string;
}

const STORAGE_KEY = "am-control-acceso-v2";
export const ACCESS_UPDATED_EVENT = "am-access-control-updated";

const chiefs: Record<Sector, string> = {
  RRHH: "Jefe de RRHH",
  OPERACIONES: "Jefe de Operaciones",
  ELECTRONICA: "Jefe de Electrónica",
  MONITOREO: "Jefe de Monitoreo",
  TESORERIA: "Jefe de Tesorería",
  COMERCIAL: "Jefe Comercial",
};

const demoEmployees: Employee[] = [
  { id: "e001", legajo: "1001", dni: "30111222", name: "Ana Pérez", sector: "RRHH", jefe: chiefs.RRHH },
  { id: "e002", legajo: "1002", dni: "30222333", name: "Lucía Gómez", sector: "RRHH", jefe: chiefs.RRHH },
  { id: "e003", legajo: "2001", dni: "31333444", name: "Carlos Díaz", sector: "OPERACIONES", jefe: chiefs.OPERACIONES },
  { id: "e004", legajo: "2002", dni: "31444555", name: "Martín López", sector: "OPERACIONES", jefe: chiefs.OPERACIONES },
  { id: "e005", legajo: "3001", dni: "32555666", name: "Sofía Torres", sector: "ELECTRONICA", jefe: chiefs.ELECTRONICA },
  { id: "e006", legajo: "3002", dni: "32666777", name: "Diego Ruiz", sector: "ELECTRONICA", jefe: chiefs.ELECTRONICA },
  { id: "e007", legajo: "4001", dni: "33777888", name: "Paula Romero", sector: "MONITOREO", jefe: chiefs.MONITOREO },
  { id: "e008", legajo: "4002", dni: "33888999", name: "Nicolás Acosta", sector: "MONITOREO", jefe: chiefs.MONITOREO },
  { id: "e009", legajo: "5001", dni: "34999000", name: "Marina Silva", sector: "TESORERIA", jefe: chiefs.TESORERIA },
  { id: "e010", legajo: "5002", dni: "35100111", name: "Javier Medina", sector: "TESORERIA", jefe: chiefs.TESORERIA },
  { id: "e011", legajo: "6001", dni: "36211222", name: "Carolina Vega", sector: "COMERCIAL", jefe: chiefs.COMERCIAL },
  { id: "e012", legajo: "6002", dni: "36322333", name: "Federico Castro", sector: "COMERCIAL", jefe: chiefs.COMERCIAL },
];

const initialState = (): AccessState => ({
  employees: demoEmployees,
  movements: [],
  visits: Array.from({ length: 6 }, (_, index) => ({
    code: `VISITA ${String(index + 1).padStart(2, "0")}`,
    occupied: false,
  })),
});

function browserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAccessState(): AccessState {
  if (!browserStorageAvailable()) return initialState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as AccessState;
    return {
      employees: parsed.employees?.length ? parsed.employees : demoEmployees,
      movements: parsed.movements ?? [],
      visits: parsed.visits?.length === 6 ? parsed.visits : initialState().visits,
    };
  } catch {
    const seed = initialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveAccessState(state: AccessState) {
  if (!browserStorageAvailable()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(ACCESS_UPDATED_EVENT));
}

export function resetDemoState() {
  saveAccessState(initialState());
}

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function movementsToday(state: AccessState, employeeId?: string) {
  return state.movements
    .filter((movement) => isToday(movement.timestamp) && (!employeeId || movement.employeeId === employeeId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getEmployeeStatus(state: AccessState, employeeId: string): EmployeeStatus {
  const movements = movementsToday(state, employeeId);
  const last = movements[movements.length - 1];
  if (!last) return "NO_INGRESO";

  switch (last.type) {
    case "INGRESO":
    case "ALMUERZO_REGRESO":
    case "COMISION_REGRESO":
    case "OTRA_REGRESO":
      return "PRESENTE";
    case "ALMUERZO_SALIDA":
      return "ALMUERZO";
    case "COMISION_SALIDA":
    case "OTRA_SALIDA":
      return "COMISION";
    case "EGRESO":
      return "EGRESADO";
    default:
      return "NO_INGRESO";
  }
}

export function statusLabel(status: EmployeeStatus) {
  const labels: Record<EmployeeStatus, string> = {
    NO_INGRESO: "No ingresó",
    PRESENTE: "Presente",
    ALMUERZO: "En almuerzo",
    COMISION: "En comisión",
    EGRESADO: "Egresado",
  };
  return labels[status];
}

export function proposedMovement(status: EmployeeStatus): MovementType {
  if (status === "PRESENTE") return "EGRESO";
  if (status === "ALMUERZO") return "ALMUERZO_REGRESO";
  if (status === "COMISION") return "COMISION_REGRESO";
  return "INGRESO";
}

export function movementLabel(type: MovementType) {
  const labels: Record<MovementType, string> = {
    INGRESO: "INGRESO",
    EGRESO: "EGRESO DE JORNADA",
    ALMUERZO_SALIDA: "SALIDA A ALMUERZO",
    ALMUERZO_REGRESO: "REGRESO DE ALMUERZO",
    COMISION_SALIDA: "SALIDA EN COMISIÓN",
    COMISION_REGRESO: "REGRESO DE COMISIÓN",
    OTRA_SALIDA: "SALIDA AUTORIZADA",
    OTRA_REGRESO: "REGRESO DE SALIDA",
  };
  return labels[type];
}

export function addMovement(
  employeeId: string,
  type: MovementType,
  options?: { reason?: string; authorizedBy?: string },
) {
  const state = getAccessState();
  const status = getEmployeeStatus(state, employeeId);

  const valid =
    (type === "INGRESO" && (status === "NO_INGRESO" || status === "EGRESADO")) ||
    (type === "EGRESO" && status === "PRESENTE") ||
    (type === "ALMUERZO_SALIDA" && status === "PRESENTE") ||
    (type === "ALMUERZO_REGRESO" && status === "ALMUERZO") ||
    ((type === "COMISION_SALIDA" || type === "OTRA_SALIDA") && status === "PRESENTE") ||
    ((type === "COMISION_REGRESO" || type === "OTRA_REGRESO") && status === "COMISION");

  if (!valid) throw new Error(`Movimiento incompatible con el estado actual: ${statusLabel(status)}`);

  const movement: Movement = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId,
    type,
    timestamp: new Date().toISOString(),
    ...options,
  };
  saveAccessState({ ...state, movements: [...state.movements, movement] });
  return movement;
}

export function findEmployeeFromScan(raw: string, state = getAccessState()) {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return undefined;

  const exact = state.employees.find(
    (employee) => employee.dni === normalized || employee.legajo === normalized || employee.id.toUpperCase() === normalized,
  );
  if (exact) return exact;

  const numericTokens = normalized.match(/\d{4,9}/g) ?? [];
  return state.employees.find(
    (employee) => normalized.includes(employee.dni) || normalized.includes(employee.legajo) || numericTokens.includes(employee.dni),
  );
}

function minutesFromMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function getDelayInfo(state: AccessState, employeeId: string): DelayInfo {
  const firstEntry = movementsToday(state, employeeId).find((movement) => movement.type === "INGRESO");
  if (!firstEntry) return { level: "SIN_INGRESO", label: "Sin ingreso", className: "bg-muted text-muted-foreground" };
  const minutes = minutesFromMidnight(new Date(firstEntry.timestamp));
  if (minutes <= 8 * 60 + 5) return { level: "NORMAL", label: "En horario", className: "bg-emerald-500/15 text-emerald-500" };
  if (minutes <= 8 * 60 + 20) return { level: "LEVE", label: "Tarde", className: "bg-orange-500/15 text-orange-500" };
  return { level: "IMPORTANTE", label: "Tarde +20 min", className: "bg-red-500/15 text-red-500" };
}

export function getLunchElapsedMinutes(state: AccessState, employeeId: string) {
  const status = getEmployeeStatus(state, employeeId);
  if (status !== "ALMUERZO") return 0;
  const exit = [...movementsToday(state, employeeId)].reverse().find((movement) => movement.type === "ALMUERZO_SALIDA");
  if (!exit) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(exit.timestamp).getTime()) / 60000));
}

export function assignVisit(
  code: string,
  data: { visitorName: string; dni: string; company?: string; destination: string; reason: string },
) {
  const state = getAccessState();
  const visits = state.visits.map((credential) =>
    credential.code === code && !credential.occupied
      ? { ...credential, ...data, occupied: true, checkIn: new Date().toISOString(), checkOut: undefined }
      : credential,
  );
  saveAccessState({ ...state, visits });
}

export function releaseVisit(code: string) {
  const state = getAccessState();
  const visits = state.visits.map((credential) =>
    credential.code === code
      ? { code: credential.code, occupied: false, checkOut: new Date().toISOString() }
      : credential,
  );
  saveAccessState({ ...state, visits });
}

export function formatTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
