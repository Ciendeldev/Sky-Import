param(
  [string]$Documento = 'C:\Code\SkyImport\docs\srs\SRS-Sky-Import.docx',
  [string]$Pdf = 'C:\Code\SkyImport\docs\srs\SRS-Sky-Import.pdf'
)
$ErrorActionPreference = 'Stop'
$wordSrs = $null
$docSrs = $null
try {
  $wordSrs = New-Object -ComObject Word.Application
  $wordSrs.Visible = $false
  $wordSrs.DisplayAlerts = 0
  $wordSrs.AutomationSecurity = 3
  $docSrs = $wordSrs.Documents.Open($Documento, $false, $false, $false)
  $docSrs.TrackRevisions = $false
  if ($docSrs.Revisions.Count -gt 0) { $docSrs.AcceptAllRevisions() }
  $docSrs.Fields.Update() | Out-Null
  foreach ($tocSrs in $docSrs.TablesOfContents) { $tocSrs.Update() }
  $docSrs.Repaginate()
  foreach ($tocSrs in $docSrs.TablesOfContents) { $tocSrs.UpdatePageNumbers() }
  foreach ($sectionSrs in $docSrs.Sections) {
    foreach ($footerSrs in $sectionSrs.Footers) { $footerSrs.Range.Fields.Update() | Out-Null }
  }
  $docSrs.Save()
  $docSrs.ExportAsFixedFormat($Pdf, 17)
  [pscustomobject]@{ Documento = $Documento; Pdf = $Pdf; Paginas = $docSrs.ComputeStatistics(2); Indices = $docSrs.TablesOfContents.Count } | ConvertTo-Json -Compress
} finally {
  if ($null -ne $docSrs) { $docSrs.Close(0); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($docSrs) }
  if ($null -ne $wordSrs) { $wordSrs.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wordSrs) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
