# Past de tekstwissels uit pt1-vwo4-paren.json toe op deck 10.1 (dia's en sprekersnotities).
# Gebruik: powershell -NoProfile -ExecutionPolicy Bypass -File tools\zet-pt1-deck.ps1 -Set veilig|groepen [-Deck <pad>] [-Backup <map>] [-Proef]
param([Parameter(Mandatory)][ValidateSet('veilig','groepen')][string]$Set, [string]$Deck, [string]$Backup, [switch]$Proef)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (-not $Deck) { $Deck = "C:\Users\nwn\OneDrive - CSG Prins Maurits\Documenten - Sectie Muziek\02 Keuzevak muziek\VWO\VWO 4\Lessen 2026-2027\10.1 PT1 afnemen - samenspel en zang.pptx" }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$paren = (Get-Content (Join-Path $PSScriptRoot 'pt1-vwo4-paren.json') -Raw -Encoding UTF8 | ConvertFrom-Json).$Set
$tel = @{}; $tekst = @{}
$z = [IO.Compression.ZipFile]::OpenRead($Deck)
foreach ($e in $z.Entries) {
  if ($e.FullName -notmatch '^ppt/(slides/slide\d+|notesSlides/notesSlide\d+)\.xml$') { continue }
  $r = New-Object IO.StreamReader($e.Open(), $utf8); $x = $r.ReadToEnd(); $r.Close(); $n = $x
  foreach ($p in $paren) { if ($n.Contains($p[0])) { $tel[$p[0]] = [int]$tel[$p[0]] + 1; $n = $n.Replace($p[0], $p[1]) } }
  if ($n -cne $x) { $tekst[$e.FullName] = $n }
}
$z.Dispose()
foreach ($p in $paren) { "{0} x  {1}" -f [int]$tel[$p[0]], $p[0] }
if ($Proef -or -not $tekst.Count) { 'niets geschreven'; return }
if ($Backup) { New-Item -ItemType Directory -Force $Backup | Out-Null; Copy-Item -LiteralPath $Deck -Destination $Backup -Force }
$z = [IO.Compression.ZipFile]::Open($Deck, 'Update')
foreach ($k in $tekst.Keys) { $z.GetEntry($k).Delete(); $w = New-Object IO.StreamWriter($z.CreateEntry($k).Open(), $utf8); $w.Write($tekst[$k]); $w.Close() }
$z.Dispose()
"geschreven: $($tekst.Count) onderdelen"
