# Production Cache-Busting Script
# Adds version numbers to CSS/JS files for live deployment

$VERSION = Get-Date -Format "yyyyMMddHHmm"
Write-Host "Adding production cache-busting version: $VERSION" -ForegroundColor Green

$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    
    # Add version to CSS and JS files
    $content = $content -replace '\.css"', ".css?v=$VERSION`""
    $content = $content -replace '\.js"', ".js?v=$VERSION`""
    
    # Remove duplicate version parameters  
    $content = $content -replace '\?v=\w+\?v=\w+', "?v=$VERSION"
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  Added version $VERSION" -ForegroundColor Green
}

Write-Host "Production cache-busting complete! Version: $VERSION" -ForegroundColor Green