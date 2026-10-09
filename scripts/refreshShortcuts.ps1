param(
  [string]$IcoPath,
  [string]$BatchPath,
  [string]$DesktopPath
)

$sh = New-Object -ComObject WScript.Shell
$desktop = if ($DesktopPath) { $DesktopPath } else { [Environment]::GetFolderPath('Desktop') }

# 1. Update any existing shortcuts on Desktop
$files = Get-ChildItem -Path $desktop -Filter "*.lnk" -ErrorAction SilentlyContinue

foreach ($f in $files) {
  if ($f.Name -like "*COOPS*" -or $f.Name -like "*SCOOPS*" -or $f.Name -like "*Provenda*") {
    try {
      $sc = $sh.CreateShortcut($f.FullName)
      if ($IcoPath -and (Test-Path $IcoPath)) {
        $sc.IconLocation = "$IcoPath,0"
      }
      $sc.Description = "SCOOPS BIR SAA - Application de Gestion de Provenderie & Caisse POS"
      $sc.Save()

      # Rename to clean short name "SCOOPS BIR SAA.lnk"
      $targetName = "SCOOPS BIR SAA.lnk"
      $newPath = Join-Path $desktop $targetName
      if ($f.FullName -ne $newPath) {
        if (Test-Path $newPath) {
          Remove-Item -Force $f.FullName
        } else {
          Rename-Item -Path $f.FullName -NewName $targetName -Force
        }
      }
      Write-Output "Updated: $($f.Name) -> $targetName"
    } catch {
      Write-Warning "Could not update shortcut: $($f.Name)"
    }
  }
}

# 2. Ensure SCOOPS BIR SAA.lnk exists pointing to launch batch
$scoopsLnk = Join-Path $desktop "SCOOPS BIR SAA.lnk"
if (-not (Test-Path $scoopsLnk) -and $BatchPath -and (Test-Path $BatchPath)) {
  try {
    $sc = $sh.CreateShortcut($scoopsLnk)
    $sc.TargetPath = $BatchPath
    $sc.WorkingDirectory = Split-Path -Parent $BatchPath
    if ($IcoPath -and (Test-Path $IcoPath)) {
      $sc.IconLocation = "$IcoPath,0"
    }
    $sc.Description = "SCOOPS BIR SAA - Application de Gestion de Provenderie & Caisse POS"
    $sc.Save()
    Write-Output "Created new desktop shortcut: $scoopsLnk"
  } catch {}
}

# 3. Refresh Windows Icon Cache via SHChangeNotify
try {
  $code = @'
  using System;
  using System.Runtime.InteropServices;
  public class IconRefresher {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);
  }
'@
  Add-Type -TypeDefinition $code -Language CSharp
  [IconRefresher]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {
  try { Start-Process "ie4uinit.exe" -ArgumentList "-show" -Wait -WindowStyle Hidden } catch {}
}

Write-Output "Windows desktop icon refresh completed."
