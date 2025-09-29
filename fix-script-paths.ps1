# Fix corrupted script tags - restore proper file paths with versions
$VERSION = "202509292036"

# Grid Generator
Write-Host "Fixing grid-generator.html..." -ForegroundColor Green
$content = Get-Content "pages\converters\grid-generator.html" -Raw
if ($content -match 'src="=') {
    $gridScripts = @(
        "    <!-- Scripts -->",
        "    <script src=`"../../assets/scripts/core/navigation.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/logger.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/error-handler.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/performance-monitor.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/file-validator.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/theme-switcher.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-manager.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-install-guide.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/converters/grid-generator.js?v=$VERSION`"></script>"
    ) -join "`n"
    
    $content = $content -replace '(\s*<script src="=[^"]*"></script>\s*)+</body>', "$gridScripts`n</body>"
    Set-Content -Path "pages\converters\grid-generator.html" -Value $content -NoNewline
    Write-Host "  Fixed grid-generator.html" -ForegroundColor Cyan
}

# PNG Icons
Write-Host "Fixing png-icons.html..." -ForegroundColor Green
$content = Get-Content "pages\converters\png-icons.html" -Raw  
if ($content -match 'src="=') {
    $pngIconsScripts = @(
        "    <!-- Scripts -->",
        "    <script src=`"../../assets/scripts/core/navigation.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/logger.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/error-handler.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/performance-monitor.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/file-validator.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/theme-switcher.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-manager.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-install-guide.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/api_client.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/ui_helpers.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/converters/png-icons.js?v=$VERSION`"></script>"
    ) -join "`n"
    
    $content = $content -replace '(\s*<script src="=[^"]*"></script>\s*)+</body>', "$pngIconsScripts`n</body>"
    Set-Content -Path "pages\converters\png-icons.html" -Value $content -NoNewline
    Write-Host "  Fixed png-icons.html" -ForegroundColor Cyan
}

# PNG to JPEG
Write-Host "Fixing png-to-jpeg.html..." -ForegroundColor Green
$content = Get-Content "pages\converters\png-to-jpeg.html" -Raw
if ($content -match 'src="=') {
    $pngJpegScripts = @(
        "    <!-- Scripts -->",
        "    <script src=`"../../assets/scripts/core/navigation.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/logger.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/error-handler.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/performance-monitor.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/file-validator.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/theme-switcher.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-manager.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-install-guide.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/api_client.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/ui_helpers.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/converters/png-to-jpeg.js?v=$VERSION`"></script>"
    ) -join "`n"
    
    $content = $content -replace '(\s*<script src="=[^"]*"></script>\s*)+</body>', "$pngJpegScripts`n</body>"
    Set-Content -Path "pages\converters\png-to-jpeg.html" -Value $content -NoNewline
    Write-Host "  Fixed png-to-jpeg.html" -ForegroundColor Cyan
}

# Image Splitter
Write-Host "Fixing image-splitter.html..." -ForegroundColor Green
$content = Get-Content "pages\converters\image-splitter.html" -Raw
if ($content -match 'src="=') {
    $imageSplitterScripts = @(
        "    <!-- Scripts -->",
        "    <script src=`"../../assets/scripts/core/navigation.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/logger.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/error-handler.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/performance-monitor.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/file-validator.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/theme-switcher.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-manager.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/core/pwa-install-guide.js?v=$VERSION`"></script>",
        "    <script src=`"../../assets/scripts/converters/image-splitter.js?v=$VERSION`"></script>"
    ) -join "`n"
    
    $content = $content -replace '(\s*<script src="=[^"]*"></script>\s*)+</body>', "$imageSplitterScripts`n</body>"
    Set-Content -Path "pages\converters\image-splitter.html" -Value $content -NoNewline
    Write-Host "  Fixed image-splitter.html" -ForegroundColor Cyan
}

Write-Host "`nAll files fixed! Script paths restored with version numbers." -ForegroundColor Green