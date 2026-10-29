# Maakt uit een beoordelingsmodel een leeg scoreblad (.xlsx, zonder leerlingnamen) met weging, cijferformule en de rubric.
# Gebruik: powershell -File maak-scoreblad.ps1 <model.json> <doel.xlsx>
param([string]$Model, [string]$Doel)
$M = Get-Content $Model -Raw -Encoding UTF8 | ConvertFrom-Json
$C = @(); foreach ($o in $M.onderdelen) { foreach ($cr in $o.criteria) { $C += [pscustomobject]@{ groep = $o.groep; c = $cr } } }
$somW = ($C | ForEach-Object { $_.c.weging } | Measure-Object -Sum).Sum
$x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
try {
  $wb = $x.Workbooks.Add(); while ($wb.Worksheets.Count -lt 2) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
  $s = $wb.Worksheets.Item(1); $s.Name = $M.toets
  $s.Cells.Item(1,1) = "$($M.titel) · $($M.klas)"; $s.Cells.Item(1,1).Font.Bold = $true; $s.Cells.Item(1,1).Font.Size = 14
  $s.Cells.Item(2,1) = "Score per onderdeel: 4, 6, 8 of 10 (tussenscores 5, 7, 9 mogen). $($M.cijfer)"
  $kop = @('Leerling', 'Solowerk', 'Samenspelstuk'); foreach ($k in $C) { $kop += "$($k.c.naam) ($($k.c.weging)x)" }; $kop += @('Cijfer', 'Opmerking per onderdeel', 'Punt voor P10')
  for ($i = 0; $i -lt $kop.Count; $i++) { $s.Cells.Item(4, $i + 1) = $kop[$i] }
  for ($i = 0; $i -lt $C.Count; $i++) { $s.Cells.Item(3, $i + 4) = $C[$i].groep }
  $eerste = 4; $laatste = 3 + $C.Count; $cijferKol = $laatste + 1
  $kolL = { param($n) $r = ''; while ($n -gt 0) { $m = ($n - 1) % 26; $r = [char](65 + $m) + $r; $n = [int](($n - $m) / 26) }; $r }
  for ($r = 5; $r -le 40; $r++) {
    $delen = @(); for ($i = 0; $i -lt $C.Count; $i++) { $delen += "$(& $kolL ($eerste + $i))$r*$($C[$i].c.weging)" }
    $bereik = "$(& $kolL $eerste)${r}:$(& $kolL $laatste)$r"
    $s.Cells.Item($r, $cijferKol).Formula = "=IF(COUNT($bereik)=$($C.Count),ROUND(($($delen -join '+'))/$somW,1),`"`")"
  }
  $v = $s.Range("$(& $kolL $eerste)5:$(& $kolL $laatste)40").Validation; $v.Delete()
  $v.Add(2, 1, 1, '4', '10'); $v.ErrorMessage = 'Vul een score van 4 tot en met 10 in.'
  $hdr = $s.Range("A4:$(& $kolL ($cijferKol + 2))4"); $hdr.Font.Bold = $true; $hdr.Font.Color = 0xFFFFFF; $hdr.Interior.Color = 0x23238C; $hdr.WrapText = $true
  $s.Range("A3:$(& $kolL ($cijferKol + 2))3").Font.Italic = $true
  $s.Columns.Item(1).ColumnWidth = 22; $s.Columns.Item(2).ColumnWidth = 22; $s.Columns.Item(3).ColumnWidth = 22
  for ($i = $eerste; $i -le $cijferKol; $i++) { $s.Columns.Item($i).ColumnWidth = 12 }
  $s.Columns.Item($cijferKol).Font.Bold = $true; $s.Columns.Item($cijferKol + 1).ColumnWidth = 50; $s.Columns.Item($cijferKol + 2).ColumnWidth = 40
  $s.Rows.Item(4).RowHeight = 32; $s.Activate(); $x.ActiveWindow.SplitRow = 4; $x.ActiveWindow.FreezePanes = $true
  # rubric
  $t = $wb.Worksheets.Item(2); $t.Name = 'Rubric'
  $t.Cells.Item(1,1) = 'Onderdeel'; $t.Cells.Item(1,2) = 'Weging'
  for ($n = 0; $n -lt $M.niveaus.Count; $n++) { $t.Cells.Item(1, 3 + $n) = "$($M.niveaus[$n].score) $($M.niveaus[$n].naam)" }
  $r = 2; foreach ($k in $C) {
    $t.Cells.Item($r,1) = "$($k.groep): $($k.c.naam)"; $t.Cells.Item($r,2) = $k.c.weging
    for ($n = 0; $n -lt $k.c.docent.Count; $n++) { $t.Cells.Item($r, 3 + $n) = $k.c.docent[$n] }; $r++ }
  $t.Cells.Item($r + 1, 1) = $M.pta
  $t.Range('A1:F1').Font.Bold = $true; $t.Columns.Item(1).ColumnWidth = 30; for ($i = 3; $i -le 6; $i++) { $t.Columns.Item($i).ColumnWidth = 40 }
  $t.Range("A2:F$($r - 1)").WrapText = $true; $t.Range("A1:F$($r - 1)").VerticalAlignment = -4160
  if (Test-Path $Doel) { Remove-Item $Doel }
  $wb.SaveAs($Doel, 51); $wb.Close($false); "klaar: $Doel"
} finally { $x.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($x) }
