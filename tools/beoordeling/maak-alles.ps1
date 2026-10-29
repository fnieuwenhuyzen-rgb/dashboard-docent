# Maakt voor één of meer beoordelingsmodellen alle bestanden en zet ze in de map Beoordeling van het model:
# docentformulier en leerlingformat (.docx + .pdf) en het lege scoreblad (.xlsx).
# Gebruik: powershell -File tools/beoordeling/maak-alles.ps1 [-Ids p1-havo4,p2-havo4] [-Doelwortel <pad>]
# Zonder -Ids: alle modellen. Met -Doelwortel ergens anders heen (om eerst te controleren).
param([string[]]$Ids, [string]$Doelwortel = "$env:USERPROFILE\OneDrive - CSG Prins Maurits\Documenten - Sectie Muziek")
$Ids = @($Ids | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$hier = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = "$env:LOCALAPPDATA\Programs\node\node.exe"
$tmp = Join-Path $env:TEMP 'beoordeling-html'
foreach ($f in Get-ChildItem $hier -Filter *.json) {
  $M = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($Ids -and ($Ids -notcontains $M.id)) { continue }
  $doel = Join-Path $Doelwortel $M.map
  New-Item -ItemType Directory -Force $doel | Out-Null
  $html = Join-Path $tmp $M.id
  if (Test-Path $html) { Remove-Item -Recurse -Force $html }
  & $node (Join-Path $hier 'maak-formulieren.js') $f.FullName $html | Out-Null
  & powershell -NoProfile -File (Join-Path $hier 'naar-word.ps1') $html $doel | Out-Null
  & powershell -NoProfile -File (Join-Path $hier 'maak-scoreblad.ps1') $f.FullName (Join-Path $doel "$($M.toets) Scoreblad $($M.klas).xlsx") | Out-Null
  "$($M.id): $doel"
}
