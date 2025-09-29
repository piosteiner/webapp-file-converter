# PowerShell script to remove cache-busting meta tags from all HTML files
# Use this before deploying to production

# Find all HTML files in pages/converters
$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Green
    
    $content = Get-Content $file.FullName -Raw
    
    # Remove cache headers
    $content = $content -replace '\s*<meta\s+http-equiv="Cache-Control"[^>]*>\r?\n?', ''
    $content = $content -replace '\s*<meta\s+http-equiv="Pragma"[^>]*>\r?\n?', ''
    $content = $content -replace '\s*<meta\s+http-equiv="Expires"[^>]*>\r?\n?', ''
    
    # Write back to file
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  ✅ Removed cache headers" -ForegroundColor Cyan
}

Write-Host "`n🎉 Done! All cache headers removed from HTML files." -ForegroundColor Green