/**
 * Centralized API Configuration
 * 
 * Sourcing secrets from environment variables.
 * Fails fast if critical secrets are missing in production.
 */

const getEnvVar = (key, defaultValue) => {
    const value = process.env[key];

    if (!value) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }

        // In production, we want to fail hard if a secret is missing
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`CRITICAL CONFIG ERROR: Missing environment variable: ${key}`);
        } else {
            console.warn(`[Config] Missing env var: ${key}. Using unsafe dev fallback.`);
            // These fallbacks are ONLY for local dev convenience and MUST NOT be valid in prod
            switch (key) {
                case 'JWT_SECRET': return 'dev_jwt_secret_unsafe_do_not_use_in_prod';
                case 'ADMIN_SECRET_TOKEN': return 'dev_admin_secret_unsafe';
                default: return undefined;
            }
        }
    }

    return value;
};

module.exports = {
    JWT_SECRET: getEnvVar('JWT_SECRET'),
    ADMIN_SECRET_TOKEN: getEnvVar('ADMIN_SECRET_TOKEN'),
    DATABASE_URL: getEnvVar('DATABASE_URL', null), // Optional for now if using Supabase directly via SDK
    NODE_ENV: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
};
