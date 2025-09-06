/**
 * Performance Monitor
 * Tracks page load times, conversion performance, and user interactions
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = [];
        this.initialized = false;
    }

    /**
     * Initialize performance monitoring
     */
    initialize() {
        if (this.initialized) return;

        this.trackPageLoad();
        this.trackUserInteractions();
        this.setupPerformanceObserver();
        this.trackMemoryUsage();

        this.initialized = true;
        logger.info('Performance monitoring initialized');
    }

    /**
     * Track page load performance
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.metrics.pageLoad = {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.fetchStart,
                    timestamp: Date.now()
                };

                logger.info('Page load metrics:', this.metrics.pageLoad);
            }
        });
    }

    /**
     * Track user interactions and conversions
     */
    trackUserInteractions() {
        // Track file uploads
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file') {
                logger.time('file-processing');
                this.trackEvent('file_upload', {
                    fileCount: e.target.files.length,
                    fileTypes: Array.from(e.target.files).map(f => f.type)
                });
            }
        });

        // Track converter usage
        document.addEventListener('click', (e) => {
            if (e.target.closest('.converter-card')) {
                const converterType = e.target.closest('.converter-card').href.split('/').pop().replace('.html', '');
                this.trackEvent('converter_accessed', { type: converterType });
            }

            if (e.target.closest('[data-action="export"]')) {
                logger.time('export-process');
                this.trackEvent('export_started');
            }
        });
    }

    /**
     * Setup Performance Observer for detailed metrics
     */
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // Track long tasks
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) {
                            logger.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
                            this.trackEvent('long_task', { duration: entry.duration });
                        }
                    });
                });
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.push(longTaskObserver);
            } catch (error) {
                logger.debug('Long task observer not supported');
            }

            // Track largest contentful paint
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.metrics.lcp = lastEntry.startTime;
                    logger.info(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (error) {
                logger.debug('LCP observer not supported');
            }
        }
    }

    /**
     * Track memory usage
     */
    trackMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memory = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                };

                // Warn if memory usage is high
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                if (usagePercent > 80) {
                    logger.warn(`High memory usage: ${usagePercent.toFixed(1)}%`);
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Track custom events
     */
    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            data: data
        };

        if (!this.metrics.events) {
            this.metrics.events = [];
        }
        this.metrics.events.push(event);

        logger.debug(`Event tracked: ${eventName}`, data);
    }

    /**
     * Start timing an operation
     */
    startTiming(label) {
        logger.time(label);
        return {
            end: () => {
                logger.timeEnd(label);
                this.trackEvent('timing_complete', { label });
            }
        };
    }

    /**
     * Get performance report
     */
    getReport() {
        return {
            metrics: this.metrics,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink
            } : null
        };
    }

    /**
     * Export performance data
     */
    exportReport() {
        const report = this.getReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        logger.info('Performance report exported');
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        logger.debug('Performance monitor cleanup completed');
    }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.initialize();
});

// Export for global use
window.PerformanceMonitor = PerformanceMonitor;
window.performanceMonitor = performanceMonitor;
