# Production Deployment Script - Replace dynamic cache-busting with static versions
# This converts JavaScript cache-busting back to normal HTML with version numbers

$VERSION = Get-Date -Format "yyyyMMddHHmm"
Write-Host "Converting to production version: $VERSION" -ForegroundColor Green

$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Replace dynamic CSS loading with static link
    $cssPattern = '<script>\s*\/\/ Cache-bust CSS with timestamp.*?document\.head\.appendChild\(cssLink\);\s*<\/script>'
    $cssReplacement = "<link rel=`"stylesheet`" href=`"../../assets/styles/styles.css?v=$VERSION`">"
    $content = $content -replace $cssPattern, $cssReplacement, 'Singleline'
    
    # Replace dynamic script loading with static scripts
    if ($content -match '(?s)<!-- Scripts with dynamic cache busting -->.*?const scripts = \[(.*?)\];.*?<\/script>') {
        $scriptsMatch = $matches[1]
        
        # Extract script paths from the array
        $scriptPaths = @()
        $pathMatches = [regex]::Matches($scriptsMatch, "'([^']+)'")
        foreach ($match in $pathMatches) {
            $scriptPaths += $match.Groups[1].Value
        }
        
        # Generate static script tags with versions
        $staticScripts = @()
        $staticScripts += "    <!-- Scripts -->"
        foreach ($path in $scriptPaths) {
            $staticScripts += "    <script src=`"$path?v=$VERSION`"></script>"
        }
        
        $staticScriptsBlock = $staticScripts -join "`n"
        
        # Replace the entire dynamic loading block
        $dynamicPattern = '(?s)<!-- Scripts with dynamic cache busting -->.*?<\/script>'
        $content = $content -replace $dynamicPattern, $staticScriptsBlock
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✅ Converted to static version $VERSION" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  No dynamic loading found" -ForegroundColor Gray
    }
}

Write-Host "`nProduction conversion complete! Version: $VERSION" -ForegroundColor Green
Write-Host "Files now have static version numbers for deployment." -ForegroundColor Blue