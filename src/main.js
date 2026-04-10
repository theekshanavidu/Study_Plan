if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('Service Worker v8 Registered');
            })
            .catch(err => {
                console.log('Registration failed:', err);
            });
    });
}
