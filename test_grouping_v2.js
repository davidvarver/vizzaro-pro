
const testCases = [
    "Townhouse Stripe Ivy Peel and Stick Wallpaper",
    "Townhouse Stripe Maroon Peel and Stick Wallpaper",
    "Townhouse Stripe Dusk Peel and Stick Wallpaper",
    "Brooklyn Delft Navy Peel and Stick Wallpaper",
    "Brooklyn Delft Ivy Peel and Stick Wallpaper",
    "Brownstone Blooms Forest Peel and Stick Wallpaper",
    "Brownstone Blooms Brick and Sky Peel and Stick Wallpaper",
    "Toile de New York Navy Peel and Stick Wallpaper",
    "Toile de New York Brick Peel and Stick Wallpaper",
    "Toile de New York Graphite Peel and Stick Wallpaper",
    "Oasis Apple & Rose Peel and Stick Wallpaper",
    "Oasis Mink & Sage Peel and Stick Wallpaper",
    "Oasis Navy Twist Peel and Stick Wallpaper",
    "Oasis Olive & Citrus Peel and Stick Wallpaper",
    "Paradise Forest Mix Peel and Stick Wallpaper",
    "Paradise Indigo & Pink Peel and Stick Wallpaper"
];

const colors = [
    'Off White', 'Dark Brown', 'Light Brown', 'Light Blue', 'Dark Blue',
    'Black & White', 'Black and White',
    'Navy', 'Teal', 'Pink', 'Blue', 'Green', 'Red', 'Black', 'White',
    'Gold', 'Silver', 'Grey', 'Gray', 'Beige', 'Cream', 'Yellow', 'Purple',
    'Orange', 'Sage', 'Mint', 'Olive', 'Charcoal', 'Ivory', 'Taupe',
    'Aqua', 'Coral', 'Tan', 'Multi', 'Neutral', 'Metallic', 'Copper', 'Bronze', 'Rose Gold'
];

function getBaseName(name) {
    // 1. Remove common suffixes (Order matters: longest first)
    let cleanName = name
        .replace(/Peel & Stick Floor Tiles/i, '')
        .replace(/Peel & Stick Floor Tile/i, '')
        .replace(/Peel & Stick Wallpaper/i, '')
        .replace(/Peel and Stick Wallpaper/i, '')
        .replace(/Peel & Stick/i, '')
        .replace(/Wallpaper/i, '')
        .replace(/ - .*/, '')
        .replace(/ \(.*/, '')
        .trim();

    // 2. Remove common colors and descriptors from the end
    // Use the CURRENT logic to see it fail
    const colorRegex = new RegExp(`\\s+(${colors.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i');

    cleanName = cleanName.replace(colorRegex, '').trim();

    return cleanName;
}

console.log("--- Testing Current Grouping Logic on New Failures ---");
testCases.forEach(name => {
    const base = getBaseName(name);
    console.log(`Original: "${name}"\n  -> Base: "${base}"`);
});
