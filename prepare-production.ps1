# Production Cache-Busting Script
# Adds version numbers to CSS/JS files for live deployment
# Run this before uploading to your server

$VERSION = Get-Date -Format "yyyyMMddHHmm"  # e.g., 202409291435
Write-Host "🚀 Adding production cache-busting version: $VERSION" -ForegroundColor Green

# Remove any existing JavaScript cache-busting first
Write-Host "🧹 Cleaning existing cache-busting..." -ForegroundColor Cyan

$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse
$htmlFiles += Get-ChildItem -Path "*.html" -ErrorAction SilentlyContinue

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove JavaScript cache-busting scripts
    $content = $content -replace '<script>\s*\/\/ Cache-bust CSS with timestamp.*?<\/script>', ''
    $content = $content -replace '<script>\s*\/\/ Auto-generated timestamps.*?<\/script>', '', 'Singleline'
    
    # Restore normal CSS link with version
    $content = $content -replace '<script>\s*\/\/ Cache-bust CSS.*?document\.head\.appendChild\(cssLink\);\s*<\/script>', "<link rel=`"stylesheet`" href=`"../../assets/styles/styles.css?v=$VERSION`">"
    
    # Replace dynamic script loading with normal script tags with versions
    if ($content -match 'const scripts = \[(.*?)\];') {
        $scriptPaths = [regex]::Matches($matches[1], "'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
        
        $staticScripts = $scriptPaths | ForEach-Object {
            "    <script src=`"$_?v=$VERSION`"></script>"
        }
        
        $staticScriptsBlock = "    <!-- Scripts -->`n" + ($staticScripts -join "`n")
        
        $content = $content -replace '(\s*<!-- Scripts with dynamic cache busting -->.*?<\/script>)', $staticScriptsBlock, 'Singleline'
    }
    
    # Add version to any remaining CSS/JS references
    $content = $content -replace '(href="[^"]+\.css)"', "`$1?v=$VERSION"
    $content = $content -replace '(src="[^"]+\.js)"', "`$1?v=$VERSION"
    
    # Remove duplicate version parameters
    $content = $content -replace '\?v=\d+\?v=\d+', "?v=$VERSION"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✅ Added version $VERSION" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  No changes needed" -ForegroundColor Gray
    }
}

Write-Host "`n🎉 Production cache-busting complete!" -ForegroundColor Green
Write-Host "📦 Version: $VERSION" -ForegroundColor Blue
Write-Host "Upload these files to your server now." -ForegroundColor Blue
Write-Host "Users will get fresh navigation on next visit!" -ForegroundColor Blue