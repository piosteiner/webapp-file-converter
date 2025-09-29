# PowerShell script to add JavaScript-based cache busting to all HTML files
# This generates fresh timestamps every page load

Write-Host "🚀 Adding JavaScript cache-busting to all HTML files..." -ForegroundColor Green

# Find all HTML files in pages/converters
$htmlFiles = Get-ChildItem -Path "pages\converters\*.html" -Recurse

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already has cache busting
    if ($content -match "Date\.now\(\)") {
        Write-Host "  ⏭️  Already has cache busting" -ForegroundColor Yellow
        continue
    }
    
    # Replace CSS link with cache-busted version
    $cssPattern = '<link rel="stylesheet" href="([^"]+\.css)"[^>]*>'
    $cssReplacement = @"
    <script>
        // Cache-bust CSS with timestamp
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '`$1?t=' + Date.now();
        document.head.appendChild(cssLink);
    </script>
"@
    
    $content = $content -replace $cssPattern, $cssReplacement
    
    # Find all script tags and replace with dynamic loading
    $scriptMatches = [regex]::Matches($content, '<script src="([^"]+\.js)"[^>]*></script>')
    
    if ($scriptMatches.Count -gt 0) {
        $scriptPaths = $scriptMatches | ForEach-Object { "            '$($_.Groups[1].Value)'" }
        $scriptArray = $scriptPaths -join ",`n"
        
        $dynamicScripts = @"
    <!-- Scripts with dynamic cache busting -->
    <script>
        // Auto-generated timestamps to force fresh script loading
        const t = Date.now();
        const scripts = [
$scriptArray
        ];
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src + '?t=' + t;
            document.head.appendChild(script);
        });
    </script>
"@
        
        # Remove old script tags and replace with dynamic loading
        $content = [regex]::Replace($content, '(\s*<!-- Scripts.*?-->)?\s*(<script src="[^"]+\.js"[^>]*></script>\s*)+', $dynamicScripts)
    }
    
    # Write back to file
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "  ✅ Added JavaScript cache busting" -ForegroundColor Green
}

Write-Host "`n🎉 Done! All HTML files now have JavaScript-based cache busting." -ForegroundColor Green
Write-Host "💡 Files will now auto-refresh on every page load!" -ForegroundColor Blue