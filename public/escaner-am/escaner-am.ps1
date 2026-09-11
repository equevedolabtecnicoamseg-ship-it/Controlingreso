# =====================================================================
#  AM SEGURIDAD - Puente de escaner de DNI
#  Permite que el boton "Escanear DNI" de la app haga girar el rodillo
#  del escaner (Plustek MobileOffice D620 u otro con alimentador duplex)
#  y devuelva las 2 caras del documento a la pantalla.
#
#  Uso: doble click en "INICIAR ESCANER AM.bat" (dejar la ventana abierta)
# =====================================================================

$ErrorActionPreference = "Stop"
$Puerto = 7777
$Dpi = 300

function Write-Log($msg) { Write-Host ("[" + (Get-Date -Format "HH:mm:ss") + "] " + $msg) }

function Get-Scanner {
  $manager = New-Object -ComObject WIA.DeviceManager
  foreach ($info in $manager.DeviceInfos) {
    # 1 = escaner
    if ($info.Type -eq 1) { return $info.Connect() }
  }
  throw "No se encontro ningun escaner conectado."
}

function Set-Prop($props, $id, $value) {
  foreach ($p in $props) {
    if ($p.PropertyID -eq $id) {
      try { $p.Value = $value } catch { }
      return
    }
  }
}

function Get-PaperPresent {
  try {
    $device = Get-Scanner
    foreach ($p in $device.Properties) {
      # 3087 = WIA_DPS_DOCUMENT_HANDLING_STATUS, bit 0x01 = FEED_READY (hay papel)
      if ($p.PropertyID -eq 3087) {
        return (([int]$p.Value -band 1) -eq 1)
      }
    }
  } catch { }
  return $false
}

function Scan-Document {
  $device = Get-Scanner

  # 3088 = manejo de documento: 1 = alimentador, 4 = duplex (ambas caras)
  Set-Prop $device.Properties 3088 5
  # 3096 = cantidad de paginas a tomar del alimentador
  Set-Prop $device.Properties 3096 1

  $item = $device.Items.Item(1)
  Set-Prop $item.Properties 6146 1     # color
  Set-Prop $item.Properties 6147 $Dpi  # dpi horizontal
  Set-Prop $item.Properties 6148 $Dpi  # dpi vertical

  $formatoJPEG = "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}"
  $imagenes = New-Object System.Collections.ArrayList

  for ($i = 1; $i -le 2; $i++) {
    try {
      $imagen = $item.Transfer($formatoJPEG)
    } catch {
      break
    }
    if ($null -eq $imagen) { break }
    $bytes = [byte[]] ($imagen.FileData.BinaryData)
    [void]$imagenes.Add([Convert]::ToBase64String($bytes))
    Write-Log ("Cara " + $i + " escaneada (" + $bytes.Length + " bytes)")
  }

  if ($imagenes.Count -eq 0) { throw "El escaner no devolvio imagenes. Revisa que el DNI este en el alimentador." }
  return $imagenes
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Puerto/")
$listener.Prefixes.Add("http://127.0.0.1:$Puerto/")
try {
  $listener.Start()
} catch {
  Write-Host "No se pudo abrir el puerto $Puerto. Cerra otra ventana del puente y volve a intentar."
  Read-Host "Enter para salir"
  exit 1
}

Write-Log "Puente de escaner AM activo en http://localhost:$Puerto"
Write-Log "Dejá esta ventana abierta mientras usás el sistema."

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $res = $context.Response

  $res.Headers.Add("Access-Control-Allow-Origin", "*")
  $res.Headers.Add("Access-Control-Allow-Headers", "*")
  $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  $res.Headers.Add("Access-Control-Allow-Private-Network", "true")

  if ($req.HttpMethod -eq "OPTIONS") {
    $res.StatusCode = 204
    $res.Close()
    continue
  }

  $ruta = $req.Url.AbsolutePath.ToLower()
  $json = ""

  if ($ruta -eq "/ping") {
    $json = '{"ok":true,"app":"escaner-am","version":2}'
  }
  elseif ($ruta -eq "/status") {
    $papel = Get-PaperPresent
    $json = '{"ok":true,"paperPresent":' + $papel.ToString().ToLower() + '}'
  }
  elseif ($ruta -eq "/scan") {
    try {
      Write-Log "Escaneando documento..."
      $imgs = Scan-Document
      $lista = ($imgs | ForEach-Object { '"' + $_ + '"' }) -join ","
      $json = '{"ok":true,"images":[' + $lista + ']}'
      Write-Log ("Listo: " + $imgs.Count + " cara(s) enviada(s) a la app.")
    } catch {
      $msg = ($_.Exception.Message -replace '"', "'")
      $json = '{"ok":false,"error":"' + $msg + '"}'
      Write-Log ("ERROR: " + $msg)
    }
  }
  else {
    $res.StatusCode = 404
    $json = '{"ok":false,"error":"ruta desconocida"}'
  }

  $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
  $res.ContentType = "application/json; charset=utf-8"
  $res.ContentLength64 = $buffer.Length
  $res.OutputStream.Write($buffer, 0, $buffer.Length)
  $res.Close()
}
