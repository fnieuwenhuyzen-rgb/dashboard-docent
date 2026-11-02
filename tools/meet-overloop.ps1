# Opent lespresentaties in PowerPoint (met de echte lettertypes) en meldt tekst die buiten zijn vak of de dia valt.
# Gebruik: powershell -File tools\meet-overloop.ps1 [-Beeld map] deck.pptx ...   -Beeld schrijft ook elke dia als png.
[CmdletBinding(PositionalBinding = $false)]
param([string]$Beeld = '', [Parameter(ValueFromRemainingArguments = $true)][string[]]$Decks)
$app = New-Object -ComObject PowerPoint.Application
$totaal = 0
foreach ($d in $Decks) {
  $p = $app.Presentations.Open((Resolve-Path -LiteralPath $d).Path, -1, 0, 0)
  $W = $p.PageSetup.SlideWidth; $H = $p.PageSetup.SlideHeight; $n = 0
  foreach ($s in $p.Slides) {
    $kaders = @()
    foreach ($v in $s.Shapes) {
      if (-not $v.HasTextFrame -or -not $v.TextFrame2.HasText) { continue }
      $tr = $v.TextFrame2.TextRange; $bh = $tr.BoundHeight; $tekst = $tr.Text; if ($tekst.Length -gt 50) { $tekst = $tekst.Substring(0, 50) }
      $onder = $v.Top + $bh
      if ($bh -gt $v.Height + 3 -or $onder -gt $H - 2) { $n++; "{0} dia {1}: hoogte {2:N0} in vak {3:N0} '{4}'" -f (Split-Path $d -Leaf), $s.SlideIndex, $bh, $v.Height, $tekst }
      if ($tr.BoundWidth -gt $v.Width + 3) { $n++; "{0} dia {1}: breedte {2:N0} in vak {3:N0} '{4}'" -f (Split-Path $d -Leaf), $s.SlideIndex, $tr.BoundWidth, $v.Width, $tekst }
      $kaders += ,@($v.Left, $v.Top, $v.Width, $bh, $tekst)
    }
    # tekst die over andere tekst valt
    for ($i = 0; $i -lt $kaders.Count; $i++) { for ($j = $i + 1; $j -lt $kaders.Count; $j++) {
      $a = $kaders[$i]; $b = $kaders[$j]
      $xs = [Math]::Min($a[0] + $a[2], $b[0] + $b[2]) - [Math]::Max($a[0], $b[0]); $ys = [Math]::Min($a[1] + $a[3], $b[1] + $b[3]) - [Math]::Max($a[1], $b[1])
      if ($xs -gt 4 -and $ys -gt 4) { $n++; "{0} dia {1}: overlap '{2}' en '{3}'" -f (Split-Path $d -Leaf), $s.SlideIndex, $a[4], $b[4] }
    } }
    if ($Beeld) { $naam = [IO.Path]::GetFileNameWithoutExtension($d) -replace '[^\w.-]', '_'; $s.Export((Join-Path $Beeld ("$naam-{0:00}.png" -f $s.SlideIndex)), 'PNG', 1280, 720) }
  }
  "{0}: {1} dia's, {2} meldingen" -f (Split-Path $d -Leaf), $p.Slides.Count, $n
  $totaal += $n; $p.Close()
}
$app.Quit(); "Totaal meldingen: $totaal"
