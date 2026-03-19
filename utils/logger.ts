export const logger = {
    info: (message: string, data?: any) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? data : '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? data : '');
    },
    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? error : '');
    },
    debug: (message: string, data?: any) => {
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? data : '');
    }
};
