# Rename HTML files with timestamp to bypass cache completely
$timestamp = Get-Date -Format "MMdd"

Write-Host "Renaming HTML files to bypass browser cache..." -ForegroundColor Green

$files = @(
    @{old="gif-to-webm.html"; new="gif-to-webm-$timestamp.html"},
    @{old="grid-generator.html"; new="grid-generator-$timestamp.html"},
    @{old="image-splitter.html"; new="image-splitter-$timestamp.html"},
    @{old="png-icons.html"; new="png-icons-$timestamp.html"},
    @{old="png-stickers.html"; new="png-stickers-$timestamp.html"},
    @{old="png-to-jpeg.html"; new="png-to-jpeg-$timestamp.html"}
)

foreach ($file in $files) {
    $oldPath = "pages\converters\$($file.old)"
    $newPath = "pages\converters\$($file.new)"
    
    if (Test-Path $oldPath) {
        Move-Item $oldPath $newPath
        Write-Host "  Renamed: $($file.old) → $($file.new)" -ForegroundColor Cyan
    }
}

Write-Host "`nHTML files renamed! Upload these new files to force fresh downloads." -ForegroundColor Green
Write-Host "Note: Update any links pointing to the old filenames." -ForegroundColor Yellow