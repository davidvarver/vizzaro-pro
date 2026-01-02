async function checkApi() {
    try {
        const url = 'https://vizzaro-pro.vercel.app/api/catalog/get?t=' + Date.now();
        console.log('Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) {
            console.error('Error:', res.status, res.statusText);
            return;
        }
        const data = await res.json();
        console.log('Success:', data.success);
        console.log('Catalog Length:', data.catalog ? data.catalog.length : 0);
        console.log('Timestamp:', data.timestamp);
        if (data.catalog && data.catalog.length > 0) {
            console.log('Sample IDs:', data.catalog.slice(0, 3).map(i => i.id).join(', '));
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
checkApi();
