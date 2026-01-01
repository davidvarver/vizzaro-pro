const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
try {
    let content = fs.readFileSync(envPath, 'utf8');
    // Replace the URL with empty string to force local API usage
    const newContent = content.replace(/EXPO_PUBLIC_API_URL=https:\/\/www\.vizzarowallpaper\.com/g, 'EXPO_PUBLIC_API_URL=');

    if (content !== newContent) {
        fs.writeFileSync(envPath, newContent);
        console.log('Successfully updated .env: EXPO_PUBLIC_API_URL is now empty (local mode).');
    } else {
        console.log('.env was not changed. Check if the URL matches exactly.');
        // Verify what IS there
        const match = content.match(/EXPO_PUBLIC_API_URL=(.*)/);
        if (match) console.log(`Current value: ${match[1]}`);
    }
} catch (err) {
    console.error('Error updating .env:', err);
}
