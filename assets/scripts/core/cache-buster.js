/**
 * Dynamic Cache Busting Script
 * Automatically adds timestamps to CSS and JS files to prevent caching
 * Run this once per page to cache-bust all resources
 */

(function() {
    'use strict';
    
    // Generate cache-busting timestamp
    const cacheBuster = Date.now();
    
    // Function to add cache-buster to URLs
    function addCacheBuster(url) {
        if (url.includes('?')) {
            return url + '&cb=' + cacheBuster;
        } else {
            return url + '?cb=' + cacheBuster;
        }
    }
    
    // Cache-bust all CSS files
    const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
    cssLinks.forEach(link => {
        if (!link.href.includes('cdnjs.cloudflare.com') && !link.href.includes('cb=')) {
            const newHref = addCacheBuster(link.href);
            link.href = newHref;
        }
    });
    
    // Cache-bust all JavaScript files (except this script and CDN files)
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
        if (!script.src.includes('cdnjs.cloudflare.com') && 
            !script.src.includes('cache-buster.js') && 
            !script.src.includes('cb=')) {
            const newSrc = addCacheBuster(script.src);
            
            // Create new script element
            const newScript = document.createElement('script');
            newScript.src = newSrc;
            newScript.type = script.type || 'text/javascript';
            
            // Copy attributes
            Array.from(script.attributes).forEach(attr => {
                if (attr.name !== 'src') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            
            // Replace old script
            script.parentNode.insertBefore(newScript, script);
            script.remove();
        }
    });
    
    console.log('🚀 Cache busting applied with timestamp:', cacheBuster);
})();