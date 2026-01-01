if (typeof window !== 'undefined') {
    window.onerror = function (message, source, lineno, colno, error) {
        const errorMsg = message + '\n' + source + ':' + lineno;
        console.error('GLOBAL ERROR:', errorMsg);
        // Use a slight delay to ensure the alert renders over a blank screen
        setTimeout(() => {
            alert('CRASH DETECTED:\n' + errorMsg + '\n\nPor favor envía una foto de esto al desarrollador.');
        }, 100);
    };

    window.addEventListener('unhandledrejection', function (event) {
        alert('PROMISE REJECTION:\n' + event.reason);
    });
}
