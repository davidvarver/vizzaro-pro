
const testCases = [
    "Dream Garden Off White Peel & Stick Wallpaper",
    "Dream Garden Teal Peel & Stick Wallpaper",
    "Dream Garden Dark Brown Peel & Stick Wallpaper",
    "Retro Esme Navy Peel & Stick Wallpaper",
    "Retro Esme Pink Peel & Stick Wallpaper",
    "Jeani Blue Peel & Stick Wallpaper",
    "Jeani Light Brown Peel & Stick Wallpaper",
    "Talia Green Peel & Stick Wallpaper",
    "Talia Light Blue Peel & Stick Wallpaper",
    "Talia Navy Peel & Stick Wallpaper"
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

console.log("--- Testing Grouping Logic ---");
testCases.forEach(name => {
    console.log(`Original: "${name}" -> Base: "${getBaseName(name)}"`);
});
