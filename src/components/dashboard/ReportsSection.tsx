import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  CalendarIcon,
  Filter,
  Download,
  Users,
  UserCheck,
  Clock,
  Building2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReportType = "personnel" | "visitors" | "access_logs" | "visitor_logs" | "complete";
type ExportFormat = "pdf" | "excel";
type DatePreset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "custom";

interface ReportOption {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const reportOptions: ReportOption[] = [
  {
    id: "personnel",
    label: "Personal Registrado",
    description: "Lista completa del personal con datos",
    icon: Users,
    color: "text-primary",
  },
  {
    id: "visitors",
    label: "Visitantes",
    description: "Registro de todos los visitantes",
    icon: UserCheck,
    color: "text-accent",
  },
  {
    id: "access_logs",
    label: "Accesos Personal",
    description: "Historial de entradas/salidas personal",
    icon: Clock,
    color: "text-success",
  },
  {
    id: "visitor_logs",
    label: "Accesos Visitantes",
    description: "Historial de entradas/salidas visitas",
    icon: Building2,
    color: "text-warning",
  },
  {
    id: "complete",
    label: "Informe Completo",
    description: "Todos los datos consolidados",
    icon: FileSpreadsheet,
    color: "text-destructive",
  },
];

const formatOptions = [
  { id: "pdf" as ExportFormat, label: "PDF", icon: FileText, description: "Con fotos incluidas" },
  { id: "excel" as ExportFormat, label: "Excel", icon: FileSpreadsheet, description: "Datos en columnas" },
];

const datePresets = [
  { id: "today" as DatePreset, label: "Hoy" },
  { id: "yesterday" as DatePreset, label: "Ayer" },
  { id: "week" as DatePreset, label: "Esta Semana" },
  { id: "month" as DatePreset, label: "Este Mes" },
  { id: "lastMonth" as DatePreset, label: "Mes Anterior" },
  { id: "custom" as DatePreset, label: "Personalizado" },
];

// AM Logo as base64 (simple AM text logo)
const AM_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0xNVQxMDowMDowMC0wNTowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNC0wMS0xNVQxMDowMDowMC0wNTowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MGFiIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTBhYiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTBhYiI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5MGFiIiBzdEV2dDp3aGVuPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+AAAgAElEQVR4nO2dd5gUVdbGf1VdPT0zPQkGZshBgiAiIEkQFRQREcCAiiDiuq5hzbqu67pmV911XXPOOWdRBJScJEhGcs7M9HR31ffjdnVPDzMguJ/f+j3P3OnpmZ7p6r5Vp+659z3nFf7yl78gjzjiCOT/+gD+v8P6Xz+A/28YKGJ8FsZoQZE+xK/g/+bj+L8A/6d/wC+hd+MNCK56E/2c63GXn0i03y1o/W7+xY/t1w7hfxDBvkMKCv2e/CQA7KGTMQ+5GaX7Dbhz/wLGd8D6N0u0f3fRPQ8oD8mDeyB7yE0I7Y7EPe1rPC/uhtD8D3+Sx/q7Cf9HIcDzQPkoAnF/wCl+FynwCCIu/G9d/OeRPhcR9wuMpO8gfP+FBhEehEAI1P/6wP7V8H8AQuhjBNveRsS/g+jcHbHrPbh2lYF/54/50P7HIYxGkILWN0Mq3oAZOBz99K8QW25DdF2O4z4PZKP9O0T/n4UxGcGYhKi/CCHXGdJ+x3zPpv+8ZdIvxvqfPPy/hRAJHUhGbIMUFwYwRgt/BLhBqH4bwmgd4QjR92LCy96ElPBvI+p/QJAA9Bqk9B/w3N8A+Rcj/Z+xNKRkRHgnYvA6ou9OgvMfxffazsj/ySj/JhDe8zASnqA7Ekjph4h+HlLiKZzz1oDrM8R/xb7+WyDtNhHSn0F0m4mU+geiM5QSEKK/gxx0Ofr56xE23IDr9G2kq+8H6P3f+gv/V0C4FtBRaIkgbQFKT9CLyoEEofE5yAH7I/uOwd7xDsKO81H/lxs2/HeBtGkwMuU3iL4H0MbdD4HvEDK+B7X4S1xbXkS6K8CK/xpz+JMAuZRE3ANIJhYJjHbIzT+Gfu65qE+dR2T5dwGo/4bH++sF+0FIBxO57UxKD1wIcupOxAWbiQ67mEjMJOLPVqCeeD/ur1ah/C8P/N+NELKJCHiS4kOXEPTlvijdnseX+xVq6ldoNW/hd1ejS/4nDv9/BSGSjiOkwL8Qij8G+j0C6cMRptzLNxkLCFz6Jc4Nb0DQDpjr/4nD/99GCKyHKP4tcsK/cL72D+zb3sHuvQa56g4QD+IcuhI15z2wd8dIX/w3D//fE6QfLqTUGejSp7gpjxII/B3prhNxVH6HI/1rHD0voFd9S9B6jET8P/2N/59DOGoQSg8ltLofcuQYhPI9qEfeRfiqRZQ5k3E+fAmBP1+K58lXcOT/0xNswheFbLcOofnDCE0uI+xHgZJ+J+oef8EXP43IqO8Qfx+E4/pLcOycR9xI7/EI/86/xr8OCPJARNhapMRroP5gpNgRBJ+4C21lLaHnFxFYsIvAv57DOuR+gsNfx3rtOMrzMgGC/0t/w78bwkgNIed/QPCDuMPvR+4+icgb5xJ+eDZlW6IJXvUe5tY/wYZLoXoNYvwfCNrK/4xV/nVCEP1PJLTkZHy6G3/EYNwdH8V8aAdCm1OJf/szIltNIJjzDMGFPQk7cS7O3l/gLD8b7b/x0P71IGQdjUy+ESl0I/J5HYm0nI6r7FncuR/i2X4Xng9uJuWMaUT/vJTgR5djKy0g2OlWPPP+/f7If/8gZB2MyLgQGbyJlPlxwtbBpMyvsPP+iY11/2h3sDPyQ5KmvUlg8UkkL/6e0Mn7oZ/9CcH+FxG/4N/3D/v3CsEHECpS8DTlRB8n8HoTKv/6LP5zXiI4+XHKVr9F3LNziH9wO8m9DyJ8+kwCR5xMwprDkN2/xvW/9dn5Xx9CfwZJPwnpziA8+TvCk0twn/MHIs4tYvS8uYhtN/Lg3XuRcPlmjDfuxH/h1bB7A8aBexD8dz7ifxMI2Q3RJR+T+GYaVx4TQ+hZb+C45TvKV4xD+nohqWuLSfx7O5pWHofS70ECT63HGXgHzq93IeP2Qvnfuu7/ahCS/0gw7nYC71SS8PcNxF53MyXrryCt7A8Ef3Ef3lv/iHtWPuWfhAi89w72qb9FPeoOXEt/h5b4G1T/e/8a/4cIfS4msPQ9IsYsJvDSdoLzdhN58T0Kz1mFb93FuPb6HmP+DZR+uT/2f12D0PQM/N0vILzg3/OP+98Dkh6B7HEfQsaLiN2vwN/qSwIxPxJ68DRslVsI3Xs/wWsXUnLRBKLWvMa2pd+xO+hO6o5ZT2ThQ4iddyXRj79AYNWb2IP+G/8H/x5C2AJKdiLkQnfEeoIxf8f/h7NEcMQN5N5wNLETz4bfd5My7TmiL/yW9KgkUs6+gdz13SjJOp2yo+9DDv2f+Cf9p8H6fkL4HwlqNYh9viDYeSQl3c/DGu4m5swbsE+/EPW+uwi/92tS6mUwrJb0yXuS0HUIAf9O8s65ktLYYUSOfoyS1f/6f9B/EsLfQIj+IG44kz85neLyPPwPT8fXqAaObLBtnU/0lXNwKJNJlP6AnJJEeeflBPqcjffW7oQ/+hXpK3/Drvgxv8j/YxECYwgl/4XCv/yZsnWbyT3+doTCc0mN+AZjzZ9JejQKS4IHT9r3lCdU4fUPJnfNMHZdejal516HN+oQ0t6bhWvPw/EvebE/B6EmCDl/IqDTOAo2Z5J3/hRCy44kbeFbMOpLoi++npRzvsNy5r8xH7+Bkp+WEHbAV4T/9CKBlauIPO0GIpe8/D/4t/4JkPogpP8Z94rVFM6rIeOULxCqRpB+zaNYpv6K0Nm3E3H+D1TucSzRq54mfr8tVL+5iPT8IOLWHQ12MsUvvUj6jq8I9L4c/7p/u3+s8NcXRIeN+Cuq4KxB5P5pJQEfYvy8jMR7ppJ2aQ7uo+djOjWD0jtG4x17BgF3H8qOzCRw4i2EDvof+DsLYQD0S4mEjqHo5V0k3/EH8j+4Dcd3B2Hd8idKDnmA2P2XU3x7P1KGHEpF3U9kPncnZYP6k3f6RCKXT8Kz7o+kz/ql/Z+FEPpGnLkVFOZeT4l0CEXzHqNq73nAYRRsehL7mSsIHT+RsnHnUNLxS0omn0X5Y++xq20BnkZv4+pYhH9fN5z7nUKFf+d/qN+7EHZ9gdLxFwSm/Zn8j3dR/Od5FH5xCqazdiUY/0eSXjuaFN9Y8vqeQ37WaLz+LVRl3oN3ah0V+zyC/+3/vB/CsF+AkHoPIdcS0u8AaT8a+F6ivM+plPS+D8PgKaT/+VzK9zyB4jdGUBmzkITZF1E47XUq0jpSN/BTXAP+BH9B+BcQ/Q8Sw9bvLgIFqVy76VT8N0wmePHTZFUFiJN+T/z4C4g57AoCr/+aio4HSFMfpehZB7tX1pOy5Q0Szy4jeMBUOH8jCX/9n/yD+dcKQTlCwS48l4azq4TI9FXEXJJD8sFHk3npCVRcfBsV5Tcwqv0tpI0bi7RfO0KnrCFi5naCN41CjDucwMG/Rsz87/yD+tcJIWcb0s8z8N9zIlWhSAq+uoPYo26h6pSXiP3hJqJ+cwVFp/4V95x34OL7yXl/F6mjdpA4+gWC+6WRfOl5OE7Z+gu9S/gHQeg/nCjfPfjuPYmQcwrBN7aQcPQUCg/9nLgj78E57HNSFlyO4+c34B+YQ+WbX5OT/TN5lWdSec0Ekq4+B/uhB+Lc97foy/69/5n+b0L4FnLheMI/LKXkz2OI/eYsnOdUEnzgTXJaLMGm/kzBWTdScNm/sQ+YgXz0g5Qv20XBgBsILj4Hbdxd+C79j/e3F8L7g5B+N+7Ey3Du+ytKE1aTeMuNJGMldt1JWOvaSEmJgdhVd5F29Sak2xdS8ek4Sh9/BG/nGuL3uwL/M/9RHy2EJITo8ST4j6Jy43YS/vQMZbEHEPfjWGJffBfzpdsoaHU4tjMfpnjDBWS2CJLQ6Qoq7/mC6JkHkZ/+MIH3z6dq7iT8b//n+xuEtDUIadex665xlBy6ieDLvyUyog/+2T8R94+ZxFxxKuVP/JUNxxdSNutg5pzZjrzm55B44QXsumc6hQdNp3TLk/geuZ7A7H/d/0K/FyGsRCiJRJj7Z0q7jqFsj/upUhYhhv4B+/Z/UTrpcsKaJBE34zHKzn6N4u9OIbnD08R1P5aiOVNJGzWL+C+3IU74NeL4Y1G6/XL+v0O4GdD/B7SLYE/egX3xqxw0czPpK3ax7d1V+C86jvKJkyg9dxH+Pa8nsPJxio6dQ8XXSyi4/2EKd/6e0ksfwp/9Ge5/7f8J+dcCIVcR6PsKQcfbpD25jPRvd7Lr4wIiu/8Bz9v/IO3uJvhejCF89hxK+l5IYOmjBPrPpPy8L3Afsoz8q28hFJ1EwW0z8Pyb/gcDfyuEtFsInvYmlVseI3bkCIqHHUFx8WCirp1C7OxHCTz+F6o2vUHKxs+wvHg0hW9PIHR1MYlj7sFv+w2Baw8i0P1C/A/8G/1bhPQqwraZZC7YwsDvlxFW8TKxH76K/q8T8F72KLs6PE1G1yWE7fkKxZ/8msiEIXgOO4Dq0ceQd1sNCTMuIXr5r/HdsInyG/5F/kchfA+p+3H47j2eiq+KSPz7U5ScOJrqxGTSRj1L0WFfkfbdIsrOupHyFweQcNRJ5K5cRu7qg4m44BYqKl8g7IQ3CXn3IDj9v+J/+P8KIXcSkQE3Up67k3VJy9j8gzfI2/gFsc8/Rdq8cyi4/T4K9zsF26RnqLhmJZlnjiTv+CkkfLKRwLKjCL/9PLRbp+Ht8Ev6rxT+C4WQG5C0k8k8axs5//gjiR9uJO6v08hKn0f2rS/T/NWn+PmqI6g8cwaRq76HzKWEph+GcOd+5D20nfyefyHiiJ7Yr/13/V+IsIqA7xxcvS/DWHoQRbc9xM4O3xI39AaKtn5D8NqXyAldT87Y4YTHjMcz/QkCq35DzmmnE/vPf1O06mB8TxSQ/N1/9D/8t0CIS4QRNwRvxaeE//4bShPL8BxdQ9FvD6b6gDHsahJNbLM8SjuOp/LqTdT9/Ayivnme4DuTqXhhHeVN38M3sYyKx/7L/g1CeBCy00x2nnIMlY9eQHTcMoLffkXF72dQ0OFyio+8gqJuN1Ox5x2Unf0Qxd8fT8Shewh2voPqfz1OSepbxI39O0L/wf/6P/B3EYL3B8J2TWDXG7VE3fY9u7c8QMnVo6jqfSKxcfPJu+08Sg/fQXCvQ/E9OpSCv+2k9LiB5NZfgGvQV0TeNJPE5//D/meCkHYQOnsykYtuI++rTey+4TCKE8dS2elIYgfcQGm7dWy+eiAV5/0bfvoC3+ldCAzrQf6fr8Z35HpiXj6ChDf+B/7m/1Yh+KNAuRqcx1B50iwCvy0j5KtYYq9fSOG6a6m+eC05nT/EfuSxJKx7F/fjv2TnqBiiB4xly/X/If/rEPY3/vEa3FuqMD8ewS4tk7rvrqNy3Spib3+B4gdfInr+jwT3WkPxsXtR9c0/cPz4BYX3PI9v4TqiV99MbOPfIyYeSfD0f/U/+CsWQu4iJPd2ct+6iOC0J4nYMITq/U+m+IAz0RY/RfHpQ0l45B7sLRvIPvg8Yq/+O+LZz5P27t2EP/4pgV/fQfjg/6r/X0P4M0LuQ9i3J+O6dydZt+6N7/47MD/2OUkb3iDq3e8oOesBKub+kcrMHyg79Ezsk+4l+a2rCd51JuL1W4hoNxH/1X/5v/Q/6PciJF0PFfvh+etrxI5YR87kSsJbLift0NsJO/pL0taNJnvPU8m55g28Z47B3qoDpcNuQDzwOSHXXYnr0V3YT/xX+X8R4sF4c45G0s6h6vJhBC++mriJD+ApzSZ6zLk4lj5H9MqpKI99TJM3B8IB9VR9cxAVx3+O+6p9iOjzO/j8J8jx/2L/Y4S/cGhtJCrdR35rB3FXQ9k+dxI7+y7yC0+j4PypZB9whzib/JXIYX+i+JVVRDb/ger3VlN55s9U/XYexVc+gn+vv0Dqf5T/GxHMQgjfDf6pFJ48jrzBHbDN/IqYhVdQtPt5rMvfJe8veWS88TGRF31A0ftnU7D2NQqm3Evhil0EbpxNybBr8bf9n/cP/u+F0BMgOR4tEE7RzCmE/yGK8N4hIq8dh/3VR4ibtB/WBz8hNv9j5JVLqb5kPGXpV6JNOwnzK48T3fYqgv1f/4v+YUL4J0LpCNB7kTfhIOKnLMN/6D9QDziJ2IKR+B6ZSEE7DxF9F7FrmoPE0Z0JnHE4xUP/RHHvYcS/tP+/9P/+/4hQ9zjCjpXsumgqkfFXEjfqRso3voz7zRNxLVxCZPliyg+eiPqPaEof74j7tGeJHPoAZQ/vJGnf+wjl/wf+Ov9WIaQfTlDN5PiPNxD+xI3UTN9F5Ln/YkvJL4kZeD/JU1/Dd+mFhB8wl9I/ryDs6PUUL32CiiOWkH3S9RS1+xf/u/8ThPTXCAk/nMKHtiGf8SGujz/FefJB1IwMsHXmMEKuvIrIzz4j9JqxFJVX4z+2AvnRLpSteJzImZ+SeOZ/2T/+/4TQ/whkr4Xdj+F67DXCC14Fzz7EnbETuzIS7erRpA79gNBL5xI87lGixi8n7Kfb8M17hJB73kd96W7Mny0g7J/+e3+N/0sI/4OQmYi75Ck8K7fj6vIaoTu2kbX+SfJueJXa/R7CM/NOwhfuS+Vu35B91q3EXvUGaUF3kvfqHUTO/Z7gf+FP+b+IkHAD7LaQePYKQi/+keg95xM1cyYVL/2Gso7PEvnrB0hY9RTe05cTOfp5qk85mcq9/0nspjspmvkQgVl/Qxj93/HH/d8I4X8Qu+ykeMaZ5B99P8ExK3GG9iMqcxLuzldT/tCBuEYtIfL4Z4m57V9E7P0Avv3HkL94IaW73k7w+JMRTj/mn/5z/zsQsp+F6PVDyH54MaGt91Jx1F+pPG0IxWMfZvfpP1E07hmy2twKR/+L8HOupazOTvq/ppL49SgKb/g3+Z//S4Swb8k5bzslT3WibHsmMRdlk3blFQR+dx57L5lE5IBXCK4Ek09Z7biTiCm/xvPJCjIvuoLi1f8J/7X+N4TYQCD8HMq+vYXo8fdi+eIi6mo/I3jJJGqP+J6KI1ayOyuD8pxDqXjxfcouGEPCp/eR+mYPyLuV4Kf/h/5P/58Q/o7o8zHJz28mvvJpEmaeh/uSO8h/dCGhR66gZoaBfce38N3L+Jv0puyh1TScNpCYpocR/vh/1z9W+GciZAeJr9xC+rrriXr4Shz9fkvFt4uoOOl+eo+bxY7F7bFMWkjNgEXYxvwR+ckH0FN2ETT2l8+Y/F8K/2eIw7YQcSGBlgNI6fcs9qwrSTr5Xio/2kxpqxUI76ygasIgCi5aTtK4FWw47XRKp/7n/TH/9xD+fRHJOxBzfiQxYTnV7z+H+8Y7Kf7LGjJPv4vYe0rJTl9I5eV3U//CXBJ3Xk7wpHkkvbYDsfm/uh/p/wKEZYig+TfE3L+Agre+J+a6uym/6hYK7nuQ0FYHkr3xE4z3VlM2dwi+x75AvvELclJ2EnncDIJj/gf+8f+fC2EeJB1J/OmvE/3iHPx33kd+8nNkvnQT4d88R+70B0m7/kJyv7iP8qKnKRu/g9ABv8O9/t/x5/5f4P8SwrsD/t2f4j/lGZy7P6f+yutIufkFipeeReBtLwx7BF+bFsQ/vIRdM7pR2WkNJcdNpXL33/Aj/8M/VPhfiJC+hkDkdJxbnsdT+yDBC2+m7tVTyV23guorVrNptzCK3zuX0qRrSfzzPCLvP4vQlL+Qfu1/wP/uPxJCShVC8sNE7H6LwLO/xfHvWUSW/Z2SWx4j8MDrlN19C/XZdoIPNyT/3WVkDhhKbMwekrf82/1hhf9TCDmbiLz6duSNmSTsfxXZ915IaN89qSu5Cvf6i3C2XkDYKbMI1P+d8qMeJmXRTnJLH8T30L/dz/X/CiH6Hsidz6Ds7wWUb3oR+39fwfXFU5T3vwdfnR/H4t+TM3oMoasMeF66leoT/k2G7X+j8Ldd+C/FEfoPgmtuIOLUHwnMP4jId+dQnXojdaf9g9rfLafukYGUPb+V4Kk3k+RaTd4p0ynZ9Cs8Iz7Hf/0/4H8bwoE4HgDZ6QP85+1i55u/I/S4L7F98CgpI5/A/9JfSV87j8Q/XEPRv26lrmw0cR+dRXDi3wmm/df/W/9VwvcRfAJC4FEI7Q5qHxDCXqGwy1HkP3sPqb97Av/px7H5wS8JXDoM/6lnEntBJsl330nB/r/mf+jf/n8awg8EZTpCejGRlbnkXTQa8fA72Db0wPy3deQ9dR+1NW+jX3EM9uP/TvXuv1Bx4kDKj/6B+LP/tf+u/3UIOb+k5vL9iVvyDgW/n0RtwWWETnmJ4jZdqHpxB0LlKOzNPqbm8B8JO/1ZnP2eIGXXv9AP/V9CSBxCxNJwUuc/S/6bW0k5fiRJH4+luv1fCF65i4R9t5J22V5U/eMqYu+spOJVB1lnbKZy4n/Bv+d/BEJ8ICL9D9TlW/GU/Jug+g1xN/4Ke9Ofsae+g1T+M9bkP2P7Yiy7bnqE6j0Ppuy0Cf9x/+B/jRA+Bnnn4bl5KcEBWwh0n4Ll3LUIf7mYhJ47qXv7dMpWd8c29Dw8Z19N4skhCu65naxz/7b/Qf93CSH9Gog5Hy79J+nH3EXK+TdTtnsirgc6U3XbSZQc+y5R59yJ78hvqDhiJxWjziVw4kq4+AoCi/5V/3NC8DsIr2xBdD+VpPeX4Rn2N8Iffo3Ck04j8dVG5CytI+e0CYStvAzLHvcT/f4i9rxkEAX/EX/3r/ofI4Q/lEB8OZmfLSVw4NNELz2TooXnYtl0FRXjh5O3x7fE33sWOelPETfzfoLDb6d41x3kPvK/8m/7n4VQPhqp6J9UrdlC5nnf4+o+DMcbc8m+ejA5xU8Sc8EcYqf/gdi7b8R+8t9xTHqAtAu3UV75FIWX/4f8jUJYC8k9kfNMeN/9E7ljJlOXu5LQrpMJeeMzQicvo+y5gZRVXMi2T8aRdq8f36X3sGvSb5E+H0qg+X/AP/F/hxC8DSn0V3JXXkjd2zuJ/uQcCsc+iHufl9l1RjuCN5xO8aXLiX3kKkL3fYDa6CeofPs2ava6Gf+tv8R/xP8wwv8LnvZ2Aj1HkHP/d1RP2EXunfMoff0wSrf9idqZX8D31xN9VCm7N24ha3I3yk/6iqy+v6P29H+9f+Q/DsKNCJFrCHz3FZ4+Y/Ff/w2ub++hcvnz5J03HvPgx0hbcQeW5TMJv/AzCuc+QPYx0wnMvpHAvL/Ev8v/FIS/E976XEJX30bclxdScOR9hL+/kezvH6D29dGEPbKKqgvuo+x/2bv3OKvq8/7j7/Nd+7bOOXNmmBlmuAiCIIJgo+KlNl5q4iW2xhhN0yZNNL/EGmOb5pdeTJo2adrftfm1SWNqvEaNSYxX1HhF0SheUBFRLgriIA4MMzPMMLez99prfX5/fNfe62zOwBBJEzL7+XjsB+xZ++xZ+6x19nv9vp/Pt/dJXKd9n8o/XsGWm5/E/dif6b+mEB4kZM6iatsEguvvIW/pLFxLx9P8yL/hP/oqMn5Yy67D76P2dRNIf+QRfP9xH4E3zyXYYwruk/6bwF7/Ev9BP1Th6fJWnbqEmrseYMf8kWRcvonaLQso/v23KP/EXUSnbqDk4ZlkZ+ey5cR/p+y/76H66OfIPfVvbXf3/xpCvEHY+h1sax8gd9KXCH76H6y7fCqZ/VaRe8+dRGf+geLzf8rW7t6kXT6K1GfvJ7R4Kdn/fi2eXW5C8f9l+CdKS2G+xfvAv1N94TgKbpjPttljyPjPJ6h84HQS8WCbV9xI6Zf/TO5TJ5F14F3kHP0jqh7Ppvy/fkLJf/+I6ub/xz9dCt8k68fvxXHxj3AvuYqqb8+nYMbLBO+qwnt0DoU/aWHb2OsoG3Y3dfOWIZ44nqJf+Mg/4kB8f/xP/ux/DxTeL1B7T0I2zsD16yUE7vop4d/mUfGD6cQOyif5C8dYt5tO9pU9SQ3cRu28LLZdM4XYRy6l8OTfsLXzP/nfxD88CMsjxLcHMd12OWkvvZvgqQ9T+NxnqQi/TPZFr5G3bg7u35xI5p8+QeZzt+G/biB5b72Qyrxzqdr8Tf4uf7//lhTe30jNpP+7xFaMp+yOn1JT9h6KJ/6RopcmkfGrFdQtTGf7m/4L39wkZVc/R82Sj+C98D/xVH6PuGv+z/5S/19JIW6C1kLSV56Fc3oPwvfOIn3adxH3nErmP22l+tlJuN9wL2UnpLP5MxtJPj0c6/d/Rvif7qH43r/d7/n/KYR/o+rz/4C94FTiP76QxJdeSnT2q2TdvJz0dZfQ/dM/oPSqn5P1UiP22S+T+/SDbG9+itJjv0HmLV/Hs/O/8X8nCt8lKOyKb8cqEo8/TuL2CWQsbEv2mXew7U/NiJHvJnDJj0lduSO2/HVsuXQXMsv+SOHH7sU+53L8hX/Cs9P/JYVzIe7vY50B0v5MfPltZJ04mOJ7FpN1/8+wnHciO1zRhx0++2OKV2yD1NsonFSG7S1PYRt/D+6/fJVw8Z/47/4Ih/BvwsEhuFqXEnx7JM6r/sLOq04i1iWLDTP6UrjqCiq+tBXLdVdQ+u41mN7/JGm7vJGCS39DxatvpuzP/4z/h/8tPh4hLIKKDezw8SB5F+xC8epF1A/bmdyiH6PbfQthS4gtPRfbZjv+P21n+6+WEnzn0aSfewV5h/8m/Lv/sP+xheBB4v/5a0Kx95B/wP8le1E+xS+dQ9bEByi6/2yqJ04msf0wCr5wBYHfN6A//gbBo/9OyopVxEqe+F/8T0nhn4WQbMB9/y64Bq4htn47mfcOxHr1w+S+50dkXjeN4P27E8l8P5l3PEl4wXrCA26l7LA36da5f5e/07893r8ZhdkYl4XNz3fheuQTRH96A+7nLiH10gC5c04l74bXse7m29n6+3EUNz5A9g+uorL+e1QPmkrWlx4n+7K/7e/1bxnCkxR9N0La0W1sm3wQNd8+hNjT+7LtrEfImnwT+Xd/j+j8t+DY70ziex+J64RfIm/fieKDfkfu9v+8sNLLRCH9gEjJdHLu3oXQjJ/jGPQNKi5cRNm9l1M84AHqLvgqm17aQMH3v85O3xxG0i/Oxje6C77/ewu2ab/Eu/R/ySL5awjhJNT6p+jaIxfvx++kdL/VZD7+U2rOm0H8I5sp3/8d5C7Ykq52yqHmybfSsOZbJC78Z/xXXUJVj2+R9cB/3b8OhfcScqt2xRN4jPzLL8a/3w/J/N5C6k5dRs2ORTTXv4/Yo7cR+u1Kym9aQN3M37F1jzsI3/Vv5C/++/2L/g1I5L8EXbwS74U/wxUZR9Xzb6Pu8m0k7z4A27+tpGzbdaQNXkL4N3lEjribmvsS5Bz6d+re8f/yn0MIJxLb6M9k/vR/KZ4yiJ3+3kLxc08TGnwP9p/8gECv17Jh5BLKbnmc1NGHUHLy+7D85F+x7vbP5Fz9P/c/ghDfj7hl5tK3dR4V3Z8k+M8PUf7MRIrmjCRn2k/IL1hN8dMvkH/IKxROOI2i2+/D8qZHSD33IPLnXU64+3/OP/z/AOGnxKLfwH7kj9iWfxf+w98i+MG15H71W2w65e9U3H0c5c+dR9VD/0DsxYcx3fUQoX9bQNFxn6D2+j+T9fP/W/8BCG+h7Cc78Xc5iMSj/0HlJ/4JY+LRrP/WiSSmvpvkHWsJnnoXFT9+ifzL53PqUQ/xofdeSM2d36Xq2GvIufN/8N9E4WXI5j0U73c7iUMPIeWKBaQ+30bKe49g82O7kPrnC6nqvZ2iT/+cysFrCE75G/X/3YX8o96DZ4d/Ivjvq0n89D/xX/O/+C8ghHZI9tvJ3bCSnI1Xk33L/1B37gIqOg8hUL0PzlOfpO7Ue4huDFH7jkcpe3QF7iNW4Nl3BcH+P8U58GS87/5X0uf8d/2bGMIlBDe9gKf/NQTaf4ric2+mYNq7qLzzAAq3hki6YyOF01oJfuw68i79Hdl5X6UopYbCh/5E9px/J3v8P/0PIzyPdB6l7Ohf4x/wU3aY9C4qN+5E8okv4L1hLOXxOyg87BKK+n8Jz9PnYD3q58SPP5TCY05j+7o7qJ37u/9R/89E4U5CxZX4Hn+C+K4/oOyhw6h4uguZ/UfTeH4C64RdqfzD10m79XFCy5+g/KEriV14Dv6T30j5hNupPPMfqE38z/ybUPiT+C7eg+xOh+B8+SkK336A7Jv/h9IrX0X2lI9T9NIuVBwyjKqvFFH4n1bSLv8fqq/eju3IEyn89r9h/dJ/kj7vP/wPKcRdELbMxnfGJ3Ef1pu6y05n+25Z1Jy2Oz47BdUvT6P0j5fje+r99F9xA8lHrsf78UPpfsNXiZf8M/6b/u/+RIQwHaL8LDyfH0XikKNJvfIcfNdtJfHDqVSH5+O+bAfEi8cS+9Fwqm54jvzJd1D+31tpu2ETtYc8+k/wt06hIISjqe51DQn/cCrH30zh98op2HAr23Kupep7AxAvPEjKc5/EtO6t9L1mO4VX3o1/0F34FnalcOzryPnD/+yfhUJcDrbZv8Nz8Hj0u56g4NWdyd+uB2VXDaV2zwPY0jmAqvNiVD91H7FxP8Y8YhDuvf8P1w4/Jqfnv5L14H/3r+S/iiB4FVnvGknlB19L1X4Pk1b9Ckn//gIV13cnJ/JKAs0TUPX+cVQdMY/q356P5/fvpfDl/0bV+D+SP/0f/5MoXA0wgK0lR9Lp+uvpPWEyOdf+msqTLyfp0/9M+Y/ux3LqYooq57D9tqXkTZ1F0UX30t+/lKKx55C4zf/GP1sKzxEsNAHP1xeSsnQSqdc+T/qx/039F75D3d0fy/3MaO0/IZadJPuTO3ErVe39L4UfuI7VwI5XD3sE/n/1j/vtE4QukzD8L26MfIfmMqSS/70/kb7ecrEdmk/7bq/H0Hknm/ZOwXr+J0j8dRG7nYyg+5C4Cu72F2tnfpuygF/98vn//3hPADwlFL8B0+yls2rMX1cffiKdsNmVHjmDbM+8h7yvXkD3gdqq/8HOs9Sdj23s8eW/9EaFnB1C2+iqC+U/iz/0n/2Uh/JDQB0Lsvv0PSHaexL7vQ/Q9IEza4pMov3kNBY+PY1vJvaTc8DFqLr+f3G1byZuaoPDVt1E05YdkvOH/8b9SCBsoePMvKDl4Lyqu/xmNXz+Oqk3TqA/8iPL5X6LuoYfJ+3eouGMM+R3nU/TbZ8i49Z2Y37qdyoZfkPOpH5J58d/zZxPC37Ft/AXy5lsIPL0T4b/thr3vX0krCSM/+gwbOi8mq/MhFH3jt+TecB7FD72agj/9jrL3fJ+ym69m+9WXk3/HP8G/SArfInD8d2l42xokP0xZ+03s8NYr6DnkIPK/OpKyDYso+8Bd+B96nPT+R1Px+lswXP4VyvfOo3LybykZ2J/Irf8D/z0Kwiv4fjEa6XonaYfsS/KXrmDDyy6nbP33kIf8D1VL/oHKPbdSePhG8h59gNAr2ql56zaKVzxL4blvIfXq79B9z+/9i/oX+UctBB9C2dBIzlpTyNz9fSq+ch7+H3yZLUscpO0/hG1v/hzBFwdSeVFP9t1+O/kPt5FzTAOle67FcegryT3tv/dfQgh/oeKS7+E6+1x8lxzElpsXU3ZRJYV/WI1v2UlsO/5mCtetofjK59n24CnEPncT3gO+SdEFT+L5/C/Iv+q//6v/NoUQZkCgN7bRF5F5wzRKV39C2ZMjCE9vwHzNRkqXd6X2q9ey5dNfJadrJ/IfPo2Ch+6jMHclO3R9mMw5b6fyx1f9vf8x/6aFYKU0Mo/Q5xbgOvF8gm0X0D21gOL1T1J7/I9xfeFkdhz6C4r/No20Qw6l6hOXEvr6X8g/8dXEu32eDY8c/F/0b/KPWwiXEdh7PI7fPk/88InEu+STVP0GtE//gfXvup2kq85Ge+pBxL98J+lv/Tp5rxpN8eSfE7vo/1AxMUB0wb+TP/Xv/C9D4fWEvT9ArJsDqjaSOnYD6TtdQ+nX7qTy5i9S/JO7qXr5RBI//hHsdiZZOy+m+JkF1F1yEoFHp5Nx/G/JPu/ff0j+n/jP8VcnhDugKO9BXHdNpejJf8X1tYvo3fU5EvMmsy3wBDlTj6Jo2a9pvfQWYu87gZKnf0TBWU9h6n0oqS/8k+w3/dP/T/wVp3A14j6lYE0PWoMrqB6RJPrPm/HdNI/yk1ey/fgHyDnxOxT/7u/E3rqB4psvomzvJ4hMvoXKd/8X/hn/mP8LCr9D6LQrKv4yn5SJPXG/+TgKx99G5VN3Enr/AgrPOY3g7h+i8spHCL13MYXvupDIl2bQ94djKJ1/H9tf80/0e8G/+j9RCOHT9M/NxnH1dXQ7cyNJz19D1bBplD39P9jvu5XMoS9TumMHtTfeg//t23Af8Db0p84m66I/EHjr0dS/77//8P/B+B9D4QWq9/8BhuWbKThyMYl3vIpuE35KxtNPsW1MAwU/fRLLh86h+nVLqXnwFYxPu4fCS5ooOOsYKq//IfFj/kX/hwnh+/jbp2K9qpbEy5dhPf1m8i+5kIqDn8c1cA9SugGe5c/E9/JQxEvTqftcPrE7G7B++RtY9v0tKU/+A/+BvwsKZ0HhGmL1T+O74WFiD7yLkkeuI+nY66m5YTXR4ypZ/50L8P/kZdJP/D4ZF2yl/I0+0j+8isj/2Z7YXn+X3/WfrhCWQOmGe6HbCRS/eCkl2w7Csu4tVF14EOmvPJKqdZPYeO8tFG4ZSsN/bqF41M/Ivvd6Ijf/mfJtP/kz/2tSeBOB5Y9TtvZ2cr9wLKU35rPx4yrCyqNh4o3suH9vEi93IrjqBQr/7yIsqecQ/+Fiko66g+L6f8cz4N+KN7/0ryiFN5Bv87NZqxaSuu9+aL/5O4H5V1H6pTnkfO1qSg/6K8XfvRn5mN/Rde7JJB//U/qe90Z2u/c9VN+xjrLPfuKf/McohC0E3Kdge+0VVP5wA5abLif+3B/IPfhpOr9lGwVn/QrHXc+x9SV3kv2eL5D96hso+8t/kb7v1ynf64dkfudf/GcohD+wT97hZKw/B/cez1Ew5n7su5xFxsivsu3QYbSefCPlj36T3G2PEv7Qb8h6RSF7fPV8Sr+wlKL3/IqMaT/8Jv9LCnERwTyBNf+C/bvfo/ArbTiO/DnRwwYSmLGB0gfuJvSJW6g5YgXmyy4h79sJ8vZ8hNpF+1H86D9j2+0b/A/+QxVCoImyMy7Es+xR/GMOoWjTXVRVX8DmddNJdg8gf+3TJFatI3/oMGLPriDln/pS8OfrqLrjPJLvv4fc/a5+68b/Sv9lCuFFqHzmVKy3LKbo7GcomHwcscJbyHzhcPK/8wdK/vgEsZ2vo3T3fqRd+U3U2y9G3nolwYd+gXnIjyh49M84dvuh+0kI56aDq0lZdDSJGydQOfoY8j79J+Kz76b4n7dS+tjFxK5bT/1rnmTrHU9SdtqBFF75RSz/9/dkfet+ip78+7fz/+UovAmxz0wKfrSIws9eiXvBzWwY+ybCl11A7m7LaOt8DbnX7ELK6E0EdplF8YhL8H93BRlf60XGjivJ+9hBFP3mn/SPSgh3EKy+leBbLyH5y3PIGHkL9j4fJ3noFOKRl/G8dj5l4e8T/UB7Cu78DPbut+Dp+w/0e87hBL54PL7L/6vfbf8XC+HbeP8yF9cJRxDsMIfNb1lC2Zo7CH/p5+Q+fiMpy0fR8kQ7gbNuom7p8dS8qgdV8+6h/rSxpP3Dv5G7x7/90E3+IwoP0xoOIvr3IXTxYup+9FNyFxqgKi+E7xpLxs2/pnjpjymZ/3a0c5/A8/ZFlF10C5W/u5G6y35J0Z8+QFn6YwQuuR9X5i8I/OV/57+LMAFCH9iP5B9dQNnKpyl54EIy7vgtRRM+w4Y/Xc/2M/pTuHQpxefeTEKTomR8Fsnr06l+3x/JfNO/8dP/iMKL0E4gu/d26P8IiT0OI7T7bIrP/iu52/4J74duRB3lI+2PB1N2yKdxr/gZebt9n7TRC6i9/FWUdvk79Q/dR8aMv+6f6m9ICOuw2M6hct5tbPvNXAovfhf1Pz6G5i2/ZPu9C6mbN4byQ/cn++rjcLztl6Tf8TXy5nwNf89bCIz8X7H8Y/0FCm9Bv/U0JH/oHezUvou88//M5m/cT+GTr6Gg4hwsZz+NY8JdJB79PHG9gdD3LqXgozdT+o3fUb/pn6i54P/mv1shnEZSZjLZr0cj/2wn4YY5RH/8I9hxLnlTPk/F8EWUr3oYz6n3Y/v0OTScthsJ+32E/7aS9L3/nv/+5/inE8I6qD6J3CPeRPLz68ib+z9kHvxlNo75Pvn/+A1CJz9J8F17Ebr6YIJfPYGa1x3OxuPOIPnk3+Df+s/4z/ynIYTbCBTOIvu5/8V25l1sqnyGDT/8AiVnXUvwjQdj/+3V1H9gGc4rrsV/ygryXzGc2hP/hv/U/2S7kEr+I/0ehbgR6n99NMFnbiDcbRHVaweT/p97ST94Mub8cxB/PIjiXaZjveY27Cu60P6qe6g+5xRS3/4vnJv/if+d/7pC8JCsnkzJ2l9SOf8s/Dd8hq5FdxP+8TvJGLqY7X9dQcP7x1LyqxdI+tSryT7iU5gvuZ3ye14k9LfZ1Jx9MtkX/Q/+J/yrF8LdYLmAqnfPJuOJG6iYM4bSLRuxfXcJRdu/RtafvknFd5ZQk3YzaQPOpuKcfvh/8kfqbn4/vst+iH/Of/Cb/tIphPdCx5sxX/hJCq6fRunDdxH9x2KKvtyOdM8F1HxvN+ry7sJ/9R0Udl+F5bTPsHHKN2na9wuEr/4G3/qP8c8phMfJLD+F0IonKHxuBuUvvJqijS+x7R1vpujMG6kI/p7g0b8if+J2iu74DNbbviT1k08RuvlT1B35G/79PgphG0SvIe2O20m9ciT+G35I8H0LqLxqEmXXXkN2wwnkXvB6ttR8nsTRf6P7oJPZYeD9lM67ntpRc7C98VeQO/CfCu6+kpx1H6Xw5d+S0eNakl55N+U7bqL8+U9T3u9XlNRcxfYLDyB7/Qxqd7iI2GU/wn3RWZTc+gq2XH8M/hf/B3/0X0IIt8JOu5O45nRCj42n5O+XEfnwVWQu/Bz2nf6B7j+7iUDGKOpvHESn624hPvvnuC7+CxkvrCO4+4kEb/sf/LP/6xLCcQQ8+1A6fiLxJZPxfP2HhP98E82lNdT8pYmk8b+j4B/uRO43ldJxj5P3sxZiB7xKxq3nkHvoP/Af+L/3TyaEB6j67yNxPpFHzR/3YutVHyYx8+P0//hSan/7Lpo+O4fKlbdTOvRASq44De8FD1F1y9fZ/sTFBE/9h7f8b/8D/1UL4Rhyy0/Gf+kE4t2fJnvR/dT8fhz5dQ9iffWptL7wdlKXrMR67xKK+j9I0ecuJnq7l/ynRpHf9X/w3/B3Iv+qhJASo/6qjxP6wgKC331HCHH+AAAJaklEQVQ95ad+lo1HPkj+xhvo/8otNFz4IKKPK+n4qzuo/c61FCyrpmDJP/6v/1cpnAexcXOp++RRFM28h6JdFrJhQzsF6yZTP+xKap/Ip+5p0v8bbbueT+XXn8V/3v04hn+P3Mf+B/69fldbCN+E4C2Lqf3RObhuuonEOzeTfflnyPz1RXDVr8g5cCUBn53yKz6P9+vPI8e1kXvD84Sse4n+2/6u/0MKexEsOZHKXU4na/4kEkvPpWrzBuK3/pIg8yg9NIL1ipMof7aJ4oNPoOpfq6i+4Y8U/u40wrd99n/d/5lCAEpgBiVHH4tl5nlknDKVwKPXU3joeoJDvsOG8x7Cn/c5EtdcRf7X2qk8cwslT/yW2q98C98J/+P+f0oK7xFMd0xKH8qGnlvxTfkJ4bS5VK26hZ2GroZF/TFNvpniC94K9xXhefFv2D79D5TN/H/8P0EKJxGi9CCqL/g49pd+Q0G/UUR+c5LIv+1E0u9vIfmq5cj/+TXdb1jNtn1vofi9j1O08HsE732CnP9IfYtIXfiXpZDeTOaOR5P57VNJRl5D1rwLqB11JamNYwku30j/81dQ+6ovk7jkq1RuDJL28gVUnnQf4d3+l/zF/0ELYTaEz76C2OcPpvzff0rByBsJ3HQK/t9dS3HxSeT+x8+J7fsS/vlX4vmn13G5F2P+8X/i/9Q/xV+yEPYj2a0byeGTSO69O70vnUrlbsOpP2I05ftvoeqf/oey/msoWPI0sb/9hsD8r5C+1g/h7/9N/rsUwjnkL/4o9q/PprzzT7Du1UFou23Yp6yn/PpxdLrqQwS6PIu3OI20sVdSuWADxb0vpvaO/4b/v/8i/MlCPIaYJz9J9ZkfwXbZ/eyQvoa8ty4l/o8jCH/8aqJzz8d32yvk/dsuFO1wNcHfnkz5Ix+l6q3/Xd/5n7QQrgG5mqrnP0Li/YcQO+U9xB58B5bOOdQtuQ7PrncQWXQQNa/6IXU3TqfwZ1/EMHQZxTdU4P1n9yd+g+O/YCF8i6x5+xP+yzk4B11O8W1/IXnxl0jefRiFc3+H+dSX2HZkE8XTFxI4/FMU9puH6bfn0nLl5WTd/8P/Nv+8hfA+9s8bge36e8h8+GUKP/4V5D1b0WfcxA6nLcPx1N9J/cUf8N+2DsnIIHT4OWQd80/4b5qMf+b/vu+F/0whPEdw4efJ/OMySt9+K8k3Xk7xpK9T1vpN0o7IoGxoF0oW7IX33z9J6Sn/iaXf/6BM/N/8d/lzC+HPhNqf7SIqFiym5rH/wn/DnZjGnET1OZso+9G32TLpdRQ98k8Ejv0J9VdegvXgbcTO+Lb/hf8phXA5FJyK+P2VVM+YQfWQx9np8FcoOf3n5F9xDIWXPUBN4EUC7xxMbclISu97Af2nf0E8+2/4X/Jn4C9XCLMg53DSq18k8OybKP7VJyj5l7vZYebPsF7zCGU3/5KSL/UheOw4CodthSPn4b79uewU/xD+k/8b/59KCEPo1O8xYjP3pPLCy0l9+WYKd30n8qZ9afnhaoKf+W84+Ci2THkb/lVJfP82lH7T/o6eMf5LppQQ/4J73y/i/8tPKR02meRPVxN84xrs/7yR3P9sZceoS/B+P4PNV42j+K57sB9g0D2/nMjLHqDs/7G+Z/8RhbATJbteRPblk8h8ZDLVQ6+h/KVDKJ03napdryX9S1VEnpxD5s9WEzvnKnK/MpaCM75N8V/+LXf7TyKELvgvPI2yGffgfep6YhfuT+qCG9l+TjOb/nY1m2+6BW+pTt7lK8j74asoL/ki2y47n4K/foPQ6f9K4f9J/mMI4VRS5k/DufJ7lPx5EVkr/07d76aT88oDKVlwFa0XrCc9/Q78dxyD96dLKLvrH0nqMZGCR/70n+MvVQi/RfQ9n+wTb0ScP5PoUX/GMHk7xSdcjuuWLYT/cDvRXz5H0Y4PoH3/6+Q8sZ7yV1xMVf/z0A//u/2P+N8phIcI7XwU8cvfSHDkQ9gO+z17t2+i7OdVRG5+gKzVF1O6aTj23Rawzf0WMu9ZSuZ3R5O9aAbl6a/+2/9GhPAagjv/I1vvvpfCfz6blH0+TPLLb8C6xyi2n3cg7h8NJv7GSOP+g/0OIvrS28l98BYKrzyZur5tFG//b/1H/acVwjSoOArP2a8jNOk09tmrjboJUwk9fi97Fc1CuepCKpa/mMDH/oC+y+VE9/kFhfMvo3b8v/W/+Z9SCGdQU34yBXdOouyQiVif+j4F18yk8OGjiV3+N0qj19Ia3Ub16f+I+91LKPT9grhpEt4x48ja45/Y8PT/3N9DCBeh/3E7FZdNp+TKxwjs/xqiJ/6FjLN2I/jj94Evme39j0LLcmq+XELkJ0uo+fcfET7hf/Cf6l+OEN5EQc/TKbnpftLHv0x04hTy7j+a7T1+x7bzDqL+9hUkbn8Yz8WPEn/jh9h2/TaKnriBwmv+Pf8shDAEa0lvyh//A7vmPUxhXF9K/vsHZJ77C3Yov4+qTx/Nju/6NkV/+TGu/zqNkvM+RdHqv+L/7L/J/3f9v0IIB5C0fDH1n/2YuDH5WOxH3UnBbfuQP/E48m6I4fz0bGzb76HmU48Q/fq7Sd19NtFJv8N77A/J+dN/0f9vIYR7Cf36LgIvbCf70lm0P3k2bS+8i4rXL6N47c2U7Twb/1krqFvzaXb45FsI7T+OwpN/gb3ut3i+8B/8P0P42yGEMdiPuxHb38dTcH4LGQ9dSM17LyRz1bnEPnkAoZ9XUPXMnVivWUT14Cvxnv9tqg68hB3u+e/7n/5PL4TjyPUeTOa6Gyk+8B1s/vTjJM79EfV/TxBY+R58v3mdSMn8OeHfxog8t4TYO3ci9rNL8O36vxT88T//vyT+exXC38g98JvkPHkz/g//B1W/OYXiMc0E7v0r/V+1B9v+3ovYxb+m9tlzSD7tDkJ/HM226U9T+p/f4b/JfxkhPEVg5cHsvOE+8h4dQdXB6yn/xN3kXj2R2A0rcP/qccz/dge5L+9F3t9/Q+Gu/0j+8X8i8Lq/7T/D3yWF0A+OuZfsJy8j8PqnKfubk9Cq+8h69j2UfnYi+ec/RMWQ95N8zA/I3PQvFD7fTPnc4wjP/dv7f/Y/sBA8EBvDtreuJ/Hdr5E8/ULqNnyUqm+9hJr6RVL/9hS2//osWQ92JXD/TlReNpOym39PaOmPqfjlb/nvuxB8yE+/ivzJt+D8/jEE/ut0vDdcR/xzT1H7zyfgfnIXMn95DWWBGSRduZysu79F0p0/47+e/OeoU0g4sZXOFXPxPjmbzLsG4r1mNbnH3o1z4EPE7vkiWYfOJP2ij1F+yrPk938c+6S7CY//D/6r/8sK4a84N9xO6a0vIJZNJP9fziD/8GvZYcdw6+nvfQH3vEeo+fF9ZJ+zmpIhO1M0+0Hcp11I/v4/+ef4/w9a8sCCL0Y+twAAAABJRU5ErkJggg==";

export function ReportsSection() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("complete");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case "week":
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case "month":
        setDateRange({ from: startOfMonth(now), to: endOfDay(now) });
        break;
      case "lastMonth":
        const lastMonth = subMonths(now, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case "custom":
        break;
    }
  };

  const fetchReportData = async () => {
    const fromDate = dateRange.from?.toISOString();
    const toDate = dateRange.to?.toISOString();

    const results: Record<string, unknown[]> = {};
    const isComplete = selectedReport === "complete";

    if (selectedReport === "personnel" || isComplete) {
      const { data } = await supabase
        .from("personnel")
        .select("*, sectors(name)")
        .gte("created_at", fromDate || "1900-01-01")
        .lte("created_at", toDate || new Date().toISOString());
      results.personnel = data || [];
    }

    if (selectedReport === "visitors" || isComplete) {
      const { data } = await supabase
        .from("visitors")
        .select("*, sectors(name)")
        .gte("created_at", fromDate || "1900-01-01")
        .lte("created_at", toDate || new Date().toISOString());
      results.visitors = data || [];
    }

    if (selectedReport === "access_logs" || isComplete) {
      const { data } = await supabase
        .from("access_logs")
        .select("*, personnel(first_name, last_name, dni_number, dni_front_url, dni_back_url, sectors(name))")
        .gte("entry_time", fromDate || "1900-01-01")
        .lte("entry_time", toDate || new Date().toISOString())
        .order("entry_time", { ascending: false });
      results.access_logs = data || [];
    }

    if (selectedReport === "visitor_logs" || isComplete) {
      const { data } = await supabase
        .from("visitor_access_logs")
        .select("*, visitors(name, dni_number, company, person_to_visit, reason, dni_photo_url, webcam_photo_url, sectors(name))")
        .gte("entry_time", fromDate || "1900-01-01")
        .lte("entry_time", toDate || new Date().toISOString())
        .order("entry_time", { ascending: false });
      results.visitor_logs = data || [];
    }

    return results;
  };

  const generateExcel = (data: Record<string, unknown[]>) => {
    const workbook = XLSX.utils.book_new();

    Object.entries(data).forEach(([sheetName, items]) => {
      if (items.length === 0) return;

      // Flatten nested objects and prepare data
      const flattenedData = items.map((item: unknown) => {
        const flat: Record<string, unknown> = {};
        Object.entries(item as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            Object.entries(value as Record<string, unknown>).forEach(([nestedKey, nestedValue]) => {
              flat[`${key}_${nestedKey}`] = nestedValue;
            });
          } else {
            flat[key] = value;
          }
        });
        return flat;
      });

      const worksheet = XLSX.utils.json_to_sheet(flattenedData);

      // Style headers (make them bold by setting column widths)
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      const colWidths: { wch: number }[] = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        colWidths.push({ wch: 20 });
      }
      worksheet["!cols"] = colWidths;

      // Translate sheet names
      const sheetNameTranslations: Record<string, string> = {
        personnel: "Personal",
        visitors: "Visitantes",
        access_logs: "Accesos_Personal",
        visitor_logs: "Accesos_Visitantes",
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetNameTranslations[sheetName] || sheetName);
    });

    const dateStr = format(new Date(), "yyyy-MM-dd_HH-mm", { locale: es });
    XLSX.writeFile(workbook, `informe_am_${selectedReport}_${dateStr}.xlsx`);
  };

  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generatePDF = async (data: Record<string, unknown[]>) => {
    const doc = new jsPDF("landscape"); // Landscape for more columns
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Add logo header
    try {
      doc.addImage(AM_LOGO_BASE64, "PNG", 15, 8, 25, 25);
    } catch (e) {
      console.log("Could not add logo:", e);
    }

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("AM SEGURIDAD", 45, 18);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Informe de Control de Acceso", 45, 26);

    // Report info
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth - 15, 15, { align: "right" });
    doc.text(
      `Período: ${dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: es }) : "-"} al ${dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: es }) : "-"}`,
      pageWidth - 15,
      21,
      { align: "right" }
    );

    yPosition = 40;

    // Section titles translations
    const sectionTitles: Record<string, string> = {
      personnel: "PERSONAL REGISTRADO",
      visitors: "VISITANTES",
      access_logs: "REGISTRO DE ACCESOS - PERSONAL",
      visitor_logs: "REGISTRO DE ACCESOS - VISITANTES",
    };

    // Column definitions for each section - ALL DATA IN ONE ROW
    const columnDefs: Record<string, { header: string; dataKey: string; width?: number }[]> = {
      personnel: [
        { header: "DNI", dataKey: "dni_number", width: 22 },
        { header: "Nombre", dataKey: "first_name", width: 25 },
        { header: "Apellido", dataKey: "last_name", width: 25 },
        { header: "Género", dataKey: "gender", width: 15 },
        { header: "Dirección", dataKey: "address", width: 40 },
        { header: "Sector", dataKey: "sector_name", width: 25 },
        { header: "Fecha", dataKey: "created_at", width: 22 },
      ],
      visitors: [
        { header: "Nombre", dataKey: "name", width: 35 },
        { header: "DNI", dataKey: "dni_number", width: 22 },
        { header: "Empresa", dataKey: "company", width: 30 },
        { header: "Visita a", dataKey: "person_to_visit", width: 25 },
        { header: "Motivo", dataKey: "reason", width: 35 },
        { header: "Sector", dataKey: "sector_name", width: 25 },
        { header: "QR", dataKey: "qr_number", width: 12 },
        { header: "Fecha", dataKey: "created_at", width: 22 },
      ],
      access_logs: [
        { header: "Tipo", dataKey: "tipo", width: 18 },
        { header: "Entrada", dataKey: "entry_time", width: 32 },
        { header: "Salida", dataKey: "exit_time", width: 32 },
        { header: "Duración", dataKey: "duration", width: 18 },
        { header: "DNI", dataKey: "personnel_dni", width: 25 },
        { header: "Nombre Completo", dataKey: "personnel_name", width: 45 },
        { header: "Sector", dataKey: "sector_name", width: 28 },
      ],
      visitor_logs: [
        { header: "Tipo", dataKey: "tipo", width: 16 },
        { header: "Entrada", dataKey: "entry_time", width: 22 },
        { header: "Salida", dataKey: "exit_time", width: 22 },
        { header: "Dur.", dataKey: "duration", width: 12 },
        { header: "Nombre", dataKey: "visitor_name", width: 26 },
        { header: "DNI", dataKey: "visitor_dni", width: 18 },
        { header: "Empresa", dataKey: "visitor_company", width: 18 },
        { header: "Visita a", dataKey: "person_to_visit", width: 18 },
        { header: "Motivo", dataKey: "reason", width: 20 },
        { header: "Sector", dataKey: "sector_name", width: 14 },
        { header: "Foto DNI", dataKey: "dni_photo", width: 25 },
        { header: "Foto Webcam", dataKey: "webcam_photo", width: 25 },
      ],
    };

    const calculateDuration = (entry: string | null, exit: string | null): string => {
      if (!entry) return "-";
      if (!exit) return "En curso";
      const entryDate = new Date(entry);
      const exitDate = new Date(exit);
      const diffMs = exitDate.getTime() - entryDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    for (const [section, items] of Object.entries(data)) {
      if (items.length === 0) continue;
      // Skip visitors and personnel sections in PDF (only show access logs with photos)
      if (section === "visitors" || section === "personnel") continue;

      // Check if we need a new page
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      // Section title with styled background
      doc.setFillColor(41, 128, 185);
      doc.rect(14, yPosition - 5, pageWidth - 28, 8, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(sectionTitles[section] || section.toUpperCase(), 18, yPosition);
      doc.text(`(${items.length} registros)`, pageWidth - 18, yPosition, { align: "right" });

      yPosition += 8;

      // Pre-load images for visitor_logs section
      const imageCache: Record<number, { dni?: string; webcam?: string }> = {};
      if (section === "visitor_logs") {
        const loadPromises: Promise<void>[] = [];
        items.forEach((item: unknown, idx: number) => {
          const record = item as Record<string, unknown>;
          const visitor = record.visitors as Record<string, unknown> | null;
          if (!visitor) return;
          imageCache[idx] = {};
          
          if (visitor.dni_photo_url) {
            loadPromises.push(
              loadImageAsBase64(visitor.dni_photo_url as string).then(b64 => {
                if (b64) imageCache[idx].dni = b64;
              })
            );
          }
          if (visitor.webcam_photo_url) {
            loadPromises.push(
              loadImageAsBase64(visitor.webcam_photo_url as string).then(b64 => {
                if (b64) imageCache[idx].webcam = b64;
              })
            );
          }
        });
        await Promise.all(loadPromises);
      }

      // Prepare table data - ONE ROW PER RECORD
      const tableData = items.map((item: unknown) => {
        const row: Record<string, string> = {};
        const record = item as Record<string, unknown>;

        if (section === "personnel") {
          row.dni_number = String(record.dni_number || "-");
          row.first_name = String(record.first_name || "-");
          row.last_name = String(record.last_name || "-");
          row.gender = String(record.gender || "-");
          row.address = String(record.address || "-").substring(0, 40);
          row.sector_name = (record.sectors as Record<string, unknown>)?.name as string || "-";
          row.created_at = record.created_at ? format(new Date(record.created_at as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
        } else if (section === "visitors") {
          row.name = String(record.name || "-");
          row.dni_number = String(record.dni_number || "-");
          row.company = String(record.company || "-").substring(0, 25);
          row.person_to_visit = String(record.person_to_visit || "-").substring(0, 20);
          row.reason = String(record.reason || "-").substring(0, 30);
          row.sector_name = (record.sectors as Record<string, unknown>)?.name as string || "-";
          row.qr_number = String(record.qr_number || "-");
          row.created_at = record.created_at ? format(new Date(record.created_at as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
        } else if (section === "access_logs") {
          row.tipo = "Personal";
          row.entry_time = record.entry_time ? format(new Date(record.entry_time as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
          row.exit_time = record.exit_time ? format(new Date(record.exit_time as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
          row.duration = calculateDuration(record.entry_time as string | null, record.exit_time as string | null);
          const personnel = record.personnel as Record<string, unknown> | null;
          row.personnel_dni = personnel?.dni_number as string || "-";
          row.personnel_name = personnel ? `${personnel.first_name} ${personnel.last_name}` : "-";
          const personnelSectors = personnel?.sectors as Record<string, unknown> | null;
          row.sector_name = String(personnelSectors?.name || "-");
        } else if (section === "visitor_logs") {
          row.entry_time = record.entry_time ? format(new Date(record.entry_time as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
          row.tipo = "Visitante";
          row.exit_time = record.exit_time ? format(new Date(record.exit_time as string), "dd/MM/yy HH:mm", { locale: es }) : "-";
          row.duration = calculateDuration(record.entry_time as string | null, record.exit_time as string | null);
          const visitor = record.visitors as Record<string, unknown> | null;
          row.visitor_name = String(visitor?.name || "-").substring(0, 25);
          row.visitor_dni = visitor?.dni_number as string || "-";
          row.visitor_company = String(visitor?.company || "-").substring(0, 15);
          row.person_to_visit = String(visitor?.person_to_visit || "-").substring(0, 15);
          row.reason = String(visitor?.reason || "-").substring(0, 20);
          const visitorSectors = visitor?.sectors as Record<string, unknown> | null;
          row.sector_name = String(visitorSectors?.name || "-").substring(0, 12);
          row.dni_photo = "";
          row.webcam_photo = "";
        }

        return row;
      });

      // Generate table with smaller font - ONE ROW PER RECORD
      const columns = columnDefs[section] || [];
      const isVisitorLogs = section === "visitor_logs";
      const dniColIdx = isVisitorLogs ? columns.findIndex(c => c.dataKey === "dni_photo") : -1;
      const webcamColIdx = isVisitorLogs ? columns.findIndex(c => c.dataKey === "webcam_photo") : -1;
      
      autoTable(doc, {
        startY: yPosition,
        head: [columns.map((col) => col.header)],
        body: tableData.map((row) => columns.map((col) => row[col.dataKey] || "-")),
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 2,
        },
        bodyStyles: {
          fontSize: 6,
          textColor: [50, 50, 50],
          cellPadding: 1.5,
          ...(isVisitorLogs ? { minCellHeight: 18 } : {}),
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: columns.reduce((acc, col, idx) => {
          if (col.width) acc[idx] = { cellWidth: col.width };
          return acc;
        }, {} as Record<number, { cellWidth: number }>),
        margin: { left: 14, right: 14 },
        theme: "grid",
        tableWidth: "auto",
        didDrawCell: isVisitorLogs ? (hookData) => {
          if (hookData.section === "body") {
            const rowIdx = hookData.row.index;
            const cached = imageCache[rowIdx];
            if (!cached) return;

            const imgWidth = 20;
            const imgHeight = 14;
            const x = hookData.cell.x + (hookData.cell.width - imgWidth) / 2;
            const y = hookData.cell.y + (hookData.cell.height - imgHeight) / 2;

            if (hookData.column.index === dniColIdx && cached.dni) {
              try {
                doc.addImage(cached.dni, "JPEG", x, y, imgWidth, imgHeight);
              } catch (e) { console.log("DNI img error:", e); }
            }
            if (hookData.column.index === webcamColIdx && cached.webcam) {
              try {
                doc.addImage(cached.webcam, "JPEG", x, y, imgWidth, imgHeight);
              } catch (e) { console.log("Webcam img error:", e); }
            }
          }
        } : undefined,
      });

      yPosition = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }


    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const currentPageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `AM Seguridad - Sistema de Control de Acceso | Página ${i} de ${pageCount}`,
        currentPageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const dateStr = format(new Date(), "yyyy-MM-dd_HH-mm", { locale: es });
    doc.save(`informe_am_${selectedReport}_${dateStr}.pdf`);
  };

  const downloadReport = async () => {
    setIsLoading(true);
    try {
      const data = await fetchReportData();

      if (selectedFormat === "excel") {
        generateExcel(data);
      } else {
        await generatePDF(data);
      }

      toast.success("Informe descargado correctamente");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Error al generar el informe");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedReportOption = reportOptions.find((r) => r.id === selectedReport);

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <FileDown className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Centro de Informes</CardTitle>
              <CardDescription>Genera y descarga reportes en PDF o Excel</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            PDF & Excel
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Tipo de Informe
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {reportOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedReport(option.id)}
                className={cn(
                  "relative p-3 rounded-xl border-2 transition-all duration-200 text-left group hover:shadow-md",
                  selectedReport === option.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn("mb-1", option.color)}>
                  <option.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold truncate">{option.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{option.description}</p>
                {selectedReport === option.id && (
                  <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Date Filters */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            Período de Fechas
          </label>

          <div className="flex flex-wrap gap-2">
            {datePresets.map((preset) => (
              <Button
                key={preset.id}
                variant={datePreset === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetChange(preset.id)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date ? endOfDay(date) : undefined }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {dateRange.from && dateRange.to && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <CalendarIcon className="h-4 w-4" />
              <span>
                Período: <span className="font-medium text-foreground">{format(dateRange.from, "dd/MM/yyyy", { locale: es })}</span>
                {" - "}
                <span className="font-medium text-foreground">{format(dateRange.to, "dd/MM/yyyy", { locale: es })}</span>
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            Formato de Descarga
          </label>
          <div className="grid grid-cols-2 gap-4">
            {formatOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedFormat(option.id)}
                className={cn(
                  "p-6 rounded-xl border-2 transition-all duration-200 text-center group hover:shadow-md",
                  selectedFormat === option.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50"
                )}
              >
                <option.icon
                  className={cn(
                    "h-10 w-10 mx-auto mb-3 transition-colors",
                    selectedFormat === option.id ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="text-lg font-bold">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Download Button */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl">
          <div className="flex items-center gap-3">
            {selectedReportOption && (
              <>
                <selectedReportOption.icon className={cn("h-6 w-6", selectedReportOption.color)} />
                <div>
                  <p className="font-semibold">{selectedReportOption.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Formato: <span className="font-mono uppercase">{selectedFormat}</span>
                  </p>
                </div>
              </>
            )}
          </div>
          <Button
            size="lg"
            onClick={downloadReport}
            disabled={isLoading}
            className="min-w-[160px] bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Descargar Informe
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
