# PowerShell script to add cache-busting meta tags to all HTML files
# Run this script whenever you want to disable caching during development

$cacheHeaders = @"
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
"@

# Find all HTML files in pages/converters
$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Green
    
    $content = Get-Content $file.FullName -Raw
    
    # Check if cache headers already exist
    if ($content -notmatch "Cache-Control") {
        # Add cache headers after viewport meta tag
        $pattern = '(<meta\s+name="viewport"[^>]*>)'
        $replacement = "`$1`n$cacheHeaders"
        
        $newContent = $content -replace $pattern, $replacement
        
        # Write back to file
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "  ✅ Added cache headers" -ForegroundColor Cyan
    } else {
        Write-Host "  ⏭️  Cache headers already present" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 Done! All HTML files now have cache-busting headers." -ForegroundColor Green
Write-Host "💡 Tip: Run 'remove-cache-headers.ps1' to remove them for production." -ForegroundColor Blue