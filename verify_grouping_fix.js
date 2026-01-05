
const testCases = [
    "Retro Esme Aqua Peel & Stick Wallpaper",
    "Retro Esme Navy Peel & Stick Wallpaper",
    "Beverly Slopes Pink Peel & Stick Wallpaper",
    "Beverly Slopes Tan Peel & Stick Wallpaper",
    "Gia Metric Black & White Peel & Stick Floor Tiles",
    "Gia Metric Coral & Blue Peel & Stick Floor Tiles",
    "Disney Minnie Mouse Sweet Bows Pink Peel & Stick Wallpaper",
    "Disney Minnie Mouse Sweet Bows Black & White Peel & Stick Wallpaper"
];

function getBaseName(name) {
    // 1. Remove common suffixes (Order matters: longest first)
    let cleanName = name
        .replace(/Peel & Stick Floor Tiles/i, '')
        .replace(/Peel & Stick Floor Tile/i, '')
        .replace(/Peel & Stick Wallpaper/i, '')
        .replace(/Peel and Stick Wallpaper/i, '')
        .replace(/Peel & Stick/i, '') // Catch-all for "Peel & Stick" without wallpaper
        .replace(/Wallpaper/i, '')
        .replace(/ - .*/, '')
        .replace(/ \(.*/, '')
        .trim();

    // 2. Remove common colors and descriptors from the end
    // Added: Aqua, Coral, Tan, Multi, Neutral, Metallic, Copper, Bronze, Rose Gold
    // Added: Black & White, Black and White
    const colors = [
        'Off White', 'Dark Brown', 'Light Brown', 'Light Blue', 'Dark Blue',
        'Black & White', 'Black and White',
        'Navy', 'Teal', 'Pink', 'Blue', 'Green', 'Red', 'Black', 'White',
        'Gold', 'Silver', 'Grey', 'Gray', 'Beige', 'Cream', 'Yellow', 'Purple',
        'Orange', 'Sage', 'Mint', 'Olive', 'Charcoal', 'Ivory', 'Taupe',
        'Aqua', 'Coral', 'Tan', 'Multi', 'Neutral', 'Metallic', 'Copper', 'Bronze', 'Rose Gold'
    ];

    // Regex to match color at end of string (e.g. "Dream Garden Teal")
    // \s+ ensures we only match whole words at the end
    const colorRegex = new RegExp(`\\s+(${colors.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i');

    // Repeat replacement to handle double colors like "Blue & White" or "Dark Blue"
    cleanName = cleanName.replace(colorRegex, '').trim();

    return cleanName;
}

console.log("--- Testing NEW Grouping Logic ---");
testCases.forEach(name => {
    console.log(`Original: "${name}" -> Base: "${getBaseName(name)}"`);
});
