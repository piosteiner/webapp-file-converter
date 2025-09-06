/**
 * Professional Logging System
 * Replaces console.log statements with configurable logging
 */

class Logger {
    constructor() {
        // Set log level based on environment
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.search.includes('debug=true');
        
        this.logLevel = this.isDevelopment ? 'debug' : 'error';
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    /**
     * Internal logging method
     */
    _log(level, message, data = null) {
        if (this.levels[level] >= this.levels[this.logLevel]) {
            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
            
            if (data) {
                console[level](prefix, message, data);
            } else {
                console[level](prefix, message);
            }
        }
    }

    /**
     * Debug logging - only in development
     */
    debug(message, data = null) {
        this._log('debug', message, data);
    }

    /**
     * Info logging
     */
    info(message, data = null) {
        this._log('info', message, data);
    }

    /**
     * Warning logging
     */
    warn(message, data = null) {
        this._log('warn', message, data);
    }

    /**
     * Error logging - always shown
     */
    error(message, data = null) {
        this._log('error', message, data);
    }

    /**
     * Performance timing
     */
    time(label) {
        if (this.isDevelopment) {
            console.time(label);
        }
    }

    /**
     * Performance timing end
     */
    timeEnd(label) {
        if (this.isDevelopment) {
            console.timeEnd(label);
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
