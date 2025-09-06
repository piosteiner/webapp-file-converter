/**
 * Global Error Handler
 * Catches and reports all unhandled errors and promise rejections
 */

class GlobalErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 50; // Prevent spam
        this.errors = [];
        this.initialized = false;
    }

    /**
     * Initialize global error handling
     */
    initialize() {
        if (this.initialized) return;

        this.setupErrorListeners();
        this.setupUnhandledRejectionHandler();
        this.setupConsoleErrorCapture();

        this.initialized = true;
        logger.info('Global error handling initialized');
    }

    /**
     * Setup window error listener
     */
    setupErrorListeners() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack
            });
        });
    }

    /**
     * Setup unhandled promise rejection handler
     */
    setupUnhandledRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'unhandled_promise_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                promise: event.promise
            });
        });
    }

    /**
     * Capture console errors
     */
    setupConsoleErrorCapture() {
        const originalError = console.error;
        console.error = (...args) => {
            // Call original console.error
            originalError.apply(console, args);
            
            // Capture for our error handling
            this.handleError({
                type: 'console_error',
                message: args.join(' '),
                args: args
            });
        };
    }

    /**
     * Handle any error
     */
    handleError(errorInfo) {
        if (this.errorCount >= this.maxErrors) {
            return; // Prevent spam
        }

        this.errorCount++;
        
        const enrichedError = {
            ...errorInfo,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.errors.push(enrichedError);
        
        // Log error using our logger
        logger.error(`${errorInfo.type}: ${errorInfo.message}`, enrichedError);

        // Show user-friendly notification for critical errors
        if (this.isCriticalError(errorInfo)) {
            this.showErrorNotification(errorInfo);
        }

        // Report to external service in production (if configured)
        if (!logger.isDevelopment) {
            this.reportError(enrichedError);
        }
    }

    /**
     * Determine if error is critical enough to show to user
     */
    isCriticalError(errorInfo) {
        const criticalKeywords = [
            'network error',
            'failed to fetch',
            'conversion failed',
            'export failed',
            'out of memory'
        ];

        const message = errorInfo.message?.toLowerCase() || '';
        return criticalKeywords.some(keyword => message.includes(keyword));
    }

    /**
     * Show user-friendly error notification
     */
    showErrorNotification(errorInfo) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <div class="error-message">
                    <strong>Something went wrong</strong>
                    <p>We encountered an issue. Please try refreshing the page or contact support if the problem persists.</p>
                </div>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles if not already added
        this.addErrorNotificationStyles();

        // Show notification
        document.body.appendChild(notification);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    /**
     * Add CSS styles for error notifications
     */
    addErrorNotificationStyles() {
        if (document.getElementById('error-notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'error-notification-styles';
        style.textContent = `
            .error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
                padding: 0;
                max-width: 400px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                animation: slideIn 0.3s ease;
            }
            
            .error-content {
                display: flex;
                align-items: flex-start;
                padding: 16px;
                gap: 12px;
            }
            
            .error-icon {
                font-size: 20px;
                flex-shrink: 0;
            }
            
            .error-message {
                flex: 1;
            }
            
            .error-message strong {
                color: #c53030;
                display: block;
                margin-bottom: 4px;
            }
            
            .error-message p {
                margin: 0;
                color: #744;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .error-close {
                background: none;
                border: none;
                font-size: 20px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .error-close:hover {
                color: #666;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Report error to external service (placeholder)
     */
    reportError(errorInfo) {
        // In a real application, you would send this to your error tracking service
        // like Sentry, LogRocket, Bugsnag, etc.
        logger.debug('Error would be reported to external service:', errorInfo);
    }

    /**
     * Get error report
     */
    getErrorReport() {
        return {
            errorCount: this.errorCount,
            errors: this.errors,
            timestamp: Date.now(),
            url: window.location.href
        };
    }

    /**
     * Export error report
     */
    exportErrorReport() {
        const report = this.getErrorReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        logger.info('Error report exported');
    }

    /**
     * Clear errors
     */
    clearErrors() {
        this.errors = [];
        this.errorCount = 0;
        logger.info('Error history cleared');
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.initialized = false;
        logger.debug('Global error handler cleanup completed');
    }
}

// Initialize global error handler
const globalErrorHandler = new GlobalErrorHandler();

// Auto-initialize immediately
globalErrorHandler.initialize();

// Export for global use
window.GlobalErrorHandler = GlobalErrorHandler;
window.globalErrorHandler = globalErrorHandler;
