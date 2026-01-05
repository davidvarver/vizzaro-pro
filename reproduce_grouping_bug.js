
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
    // 1. Remove common suffixes
    let cleanName = name
        .replace(/Peel & Stick Wallpaper/i, '')
        .replace(/Peel and Stick Wallpaper/i, '')
        .replace(/Wallpaper/i, '')
        .replace(/ - .*/, '')
        .replace(/ \(.*/, '')
        .trim();

    // 2. Remove common colors from the end
    // Sort by length desc to match "Light Blue" before "Blue"
    const colors = [
        'Off White', 'Dark Brown', 'Light Brown', 'Light Blue', 'Dark Blue',
        'Navy', 'Teal', 'Pink', 'Blue', 'Green', 'Red', 'Black', 'White',
        'Gold', 'Silver', 'Grey', 'Gray', 'Beige', 'Cream', 'Yellow', 'Purple',
        'Orange', 'Sage', 'Mint', 'Olive', 'Charcoal', 'Ivory', 'Taupe'
    ];

    // Regex to match color at end of string (e.g. "Dream Garden Teal")
    const colorRegex = new RegExp(`\\s+(${colors.join('|')})$`, 'i');

    cleanName = cleanName.replace(colorRegex, '').trim();

    return cleanName;
}

console.log("--- Testing Grouping Logic (Expect Failures) ---");
testCases.forEach(name => {
    console.log(`Original: "${name}" -> Base: "${getBaseName(name)}"`);
});
