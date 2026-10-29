# Zet de HTML-formulieren uit maak-formulieren.js om naar .docx en .pdf met Word.
# Gebruik: powershell -File naar-word.ps1 <map met html> <doelmap>
param([string]$Bron, [string]$Doel)
New-Item -ItemType Directory -Force $Doel | Out-Null
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
try {
  foreach ($f in Get-ChildItem $Bron -Filter *.html) {
    $doc = $w.Documents.Open($f.FullName, $false, $true)
    # lege slotalinea na de laatste tabel geeft anders een lege tweede pagina
    $last = $doc.Paragraphs.Last; $last.Range.Font.Size = 1; $last.SpaceBefore = 0; $last.SpaceAfter = 0; $last.LineSpacingRule = 4; $last.LineSpacing = 1
    $basis = Join-Path $Doel $f.BaseName
    $doc.SaveAs2("$basis.docx", 16)   # wdFormatDocumentDefault
    $doc.SaveAs2("$basis.pdf", 17)    # wdFormatPDF
    $doc.Close(0)
    "klaar: $($f.BaseName)"
  }
} finally { $w.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($w) }
