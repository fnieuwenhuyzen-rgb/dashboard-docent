# Vervangt de telefoon door de laptop in de presentaties van dit schooljaar (besluit Frans 4-11-2026): tekst op dia's, sprekersnotities en de foto telefoon-opnemen.jpg.
# Gebruik: powershell -NoProfile -ExecutionPolicy Bypass -File tools\zet-geen-telefoon-decks.ps1 -Backup <map> [-Proef]
param([string]$Backup, [switch]$Proef)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing
$root = "C:\Users\nwn\OneDrive - CSG Prins Maurits\Documenten - Sectie Muziek"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$paren = (Get-Content (Join-Path $PSScriptRoot 'geen-telefoon-paren.json') -Raw -Encoding UTF8 | ConvertFrom-Json).paren
$xmlParen = @(); foreach ($p in $paren) { if ($p[0] -notmatch '\.jpg$') { $xmlParen += ,@(($p[0] -replace '&','&amp;'), ($p[1] -replace '&','&amp;')) } }
$sha = [Security.Cryptography.SHA256]::Create()
function Hash([byte[]]$b) { [BitConverter]::ToString($sha.ComputeHash($b)) }
# alle versies van de telefoonfoto, met de vervangende foto uit dezelfde beeldmap
$fotos = @{}
Get-ChildItem -LiteralPath "$root\01 Onderbouw muziek","$root\02 Keuzevak muziek" -Recurse -File -Filter 'telefoon-opnemen.jpg' | ForEach-Object { $fotos[(Hash ([IO.File]::ReadAllBytes($_.FullName)))] = $_.FullName }
"telefoonfoto's: $($fotos.Count)"
function NieuweFoto([byte[]]$oud, [string]$bron) {
  $ms = New-Object IO.MemoryStream(,$oud); $o = [Drawing.Image]::FromStream($ms); $w = $o.Width; $h = $o.Height; $o.Dispose()
  $v = [Drawing.Image]::FromFile($bron); $sch = [Math]::Max($w / $v.Width, $h / $v.Height); $nw = [int][Math]::Ceiling($v.Width * $sch); $nh = [int][Math]::Ceiling($v.Height * $sch)
  $bm = New-Object Drawing.Bitmap($w, $h); $g = [Drawing.Graphics]::FromImage($bm); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($v, [int](($w - $nw) / 2), [int](($h - $nh) / 2), $nw, $nh); $g.Dispose(); $v.Dispose()
  $u = New-Object IO.MemoryStream; $bm.Save($u, [Drawing.Imaging.ImageFormat]::Jpeg); $bm.Dispose(); return ,$u.ToArray()
}
$alle = Get-ChildItem -LiteralPath "$root\01 Onderbouw muziek","$root\02 Keuzevak muziek" -Recurse -File -Filter '*.pptx' | Where-Object { $_.FullName -notmatch '99 Archief|\\Oud\\' -and $_.Name -notmatch '^~' }
$overgeslagen = @($alle | Where-Object { ($_.Attributes -band [IO.FileAttributes]::Offline) -or ($_.Attributes -band 0x400000) })
"pptx: $($alle.Count), niet lokaal (overgeslagen): $($overgeslagen.Count)"
$overgeslagen | ForEach-Object { "  niet lokaal: " + $_.FullName.Substring($root.Length + 1) }
foreach ($f in $alle) {
  if ($overgeslagen -contains $f) { continue }
  try {
    $z = [IO.Compression.ZipFile]::OpenRead($f.FullName); $tekst = @{}; $media = @{}; $nt = 0; $rest = @()
    foreach ($e in $z.Entries) {
      if ($e.FullName -match '^ppt/(slides/slide\d+|notesSlides/notesSlide\d+)\.xml$') {
        $r = New-Object IO.StreamReader($e.Open(), $utf8); $x = $r.ReadToEnd(); $r.Close(); $n = $x
        foreach ($p in $xmlParen) { if ($n.Contains($p[0])) { $nt += ($n.Length - $n.Replace($p[0], '').Length) / $p[0].Length; $n = $n.Replace($p[0], $p[1]) } }
        if ($n -cne $x) { $tekst[$e.FullName] = $n }
        foreach ($l in (($n -replace '</a:p>', "`n") -replace '<[^>]+>', '') -split "`n") { if ($l -match '(?i)(?<!kop)telefoon' -and $l -notmatch '(?i)telefoon weg|geen telefoon|telefoon in je tas') { $rest += $l } }
      } elseif ($e.FullName -match '^ppt/media/.*\.(jpe?g)$') {
        $ms = New-Object IO.MemoryStream; $st = $e.Open(); $st.CopyTo($ms); $st.Close(); $b = $ms.ToArray(); $hh = Hash $b
        if ($fotos.ContainsKey($hh)) { $media[$e.FullName] = @{ oud = $b; bron = (Join-Path (Split-Path $fotos[$hh]) 'microfoon-studio.jpg') } }
      }
    }
    $z.Dispose()
    if ($tekst.Count -or $media.Count -or $rest.Count) {
      "== " + $f.FullName.Substring($root.Length + 1) + " | tekst: $nt, foto: $($media.Count)"
      $rest | ForEach-Object { "   NOG: " + $_.Substring(0, [Math]::Min(120, $_.Length)) }
    }
    if ((-not $Proef) -and ($tekst.Count -or $media.Count)) {
      if ($Backup) { $d = Join-Path $Backup (Split-Path $f.FullName.Substring($root.Length + 1)); New-Item -ItemType Directory -Force $d | Out-Null; Copy-Item -LiteralPath $f.FullName -Destination $d -Force }
      $z = [IO.Compression.ZipFile]::Open($f.FullName, 'Update')
      foreach ($k in $tekst.Keys) { $z.GetEntry($k).Delete(); $w = New-Object IO.StreamWriter($z.CreateEntry($k).Open(), $utf8); $w.Write($tekst[$k]); $w.Close() }
      foreach ($k in $media.Keys) { $nb = NieuweFoto $media[$k].oud $media[$k].bron; $z.GetEntry($k).Delete(); $s = $z.CreateEntry($k).Open(); $s.Write($nb, 0, $nb.Length); $s.Close() }
      $z.Dispose()
    }
  } catch { "FOUT " + $f.Name + ": " + $_.Exception.Message }
}
