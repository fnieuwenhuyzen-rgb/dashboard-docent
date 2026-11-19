# Zet de HTML-bladen uit maak-printbladen.js om naar .docx en .pdf met Word, in de map uit doel.json.
# Plaatjes (de notenbalk) worden in het document opgeslagen, niet als link.
# Gebruik: powershell -File tools/printbladen/naar-word.ps1 <uitmap van maak-printbladen.js>
param([string]$Bron)
$doel = Get-Content (Join-Path $Bron 'doel.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
try {
  foreach ($f in Get-ChildItem $Bron -Filter *.html) {
    $map = $doel.($f.BaseName)
    if (-not $map) { "overgeslagen (geen doel): $($f.BaseName)"; continue }
    New-Item -ItemType Directory -Force $map | Out-Null
    $doc = $w.Documents.Open($f.FullName, $false, $true)
    foreach ($s in $doc.InlineShapes) { if ($s.LinkFormat) { $s.LinkFormat.SavePictureWithDocument = $true; $s.LinkFormat.BreakLink() } }
    foreach ($fl in @($doc.Fields)) { if ($fl.LinkFormat) { $fl.LinkFormat.SavePictureWithDocument = $true; $fl.LinkFormat.BreakLink() } }
    # lege slotalinea na de laatste tabel geeft anders een lege tweede pagina
    $last = $doc.Paragraphs.Last; $last.Range.Font.Size = 1; $last.SpaceBefore = 0; $last.SpaceAfter = 0; $last.LineSpacingRule = 4; $last.LineSpacing = 1
    $basis = Join-Path $map $f.BaseName
    $doc.SaveAs2("$basis.docx", 16)   # wdFormatDocumentDefault
    $doc.SaveAs2("$basis.pdf", 17)    # wdFormatPDF
    "klaar: $($f.BaseName) ($($doc.ComputeStatistics(2)) blz.)"
    $doc.Close(0)
  }
} finally { $w.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($w) }
