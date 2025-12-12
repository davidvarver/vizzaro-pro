/**
 * Production-safe Logger
 * 
 * Suppresses debug and info logs in production to prevent data leakage and noise.
 * Always logs errors and warnings.
 */
import { isProduction } from './config.js';

const logger = {
    // Debug: Info useful for development only (variables, steps)
    debug: (...args) => {
        if (!isProduction) {
            console.debug(...args);
        }
    },

    // Info: General operational info (requests, success states)
    info: (...args) => {
        if (!isProduction) {
            console.info(...args);
        }
    },

    // Warn: Something suspicious but not breaking
    warn: (...args) => {
        console.warn(...args);
    },

    // Error: Something broke
    error: (...args) => {
        console.error(...args);
    }
};

export default logger;
