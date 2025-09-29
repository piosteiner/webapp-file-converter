# PowerShell script to remove URL versioning parameters from all HTML files
# This removes ?v=xxxxx parameters from CSS and JS file references

# Find all HTML files
$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse
$htmlFiles += Get-ChildItem -Path "*.html" -ErrorAction SilentlyContinue

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Green
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove version parameters from CSS and JS files
    $content = $content -replace '(\.css)\?v=[^"]*', '$1'
    $content = $content -replace '(\.js)\?v=[^"]*', '$1'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✅ Removed URL versioning" -ForegroundColor Cyan
    } else {
        Write-Host "  ⏭️  No URL versioning found" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 Done! All URL versioning removed." -ForegroundColor Green
Write-Host "💡 Cache-busting now handled by meta tags only." -ForegroundColor Blue