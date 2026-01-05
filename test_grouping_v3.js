
const testCases = [
    // New Failures from Screenshots
    "Gia Metric Black & White Peel & Stick Floor Tiles",
    "Gia Metric Coral & Blue Peel & Stick Floor Tiles", // "Coral" & "Blue"
    "Cat Poses Emerald Peel & Stick Wallpaper", // "Emerald"
    "Cat Poses Pink Peel & Stick Wallpaper",
    "Whimsical Creatures Cream Peel & Stick Wallpaper", // "Cream"
    "Pasadena Ikat Breezy Pastel Peel & Stick Wallpaper", // "Breezy Pastel"
    "Champagne Harbor Pink Dream Peel & Stick Wallpaper", // "Pink Dream"
    "Champagne Harbor Powdered Blue Peel & Stick Wallpaper", // "Powdered Blue"
    "Water Lily Blush & Teal Peel & Stick Wallpaper", // "Blush & Teal"
    "Water Lily Lavender & Green Peel & Stick Wallpaper", // "Lavender & Green"
    "Amanda Beige Peel & Stick Wallpaper",
    "Amanda Blue Green Peel & Stick Wallpaper", // "Blue Green" (no separator)
    "Jesinda Cobalt Peel & Stick Wallpaper", // "Cobalt"
    // Previous Regression Tests
    "Townhouse Stripe Ivy Peel and Stick Wallpaper",
    "Oasis Apple & Rose Peel and Stick Wallpaper",
    "Paradise Forest Mix Peel and Stick Wallpaper"
];

const colors = [
    'Off White', 'Dark Brown', 'Light Brown', 'Light Blue', 'Dark Blue',
    'Black & White', 'Black and White',
    'Navy', 'Teal', 'Pink', 'Blue', 'Green', 'Red', 'Black', 'White',
    'Gold', 'Silver', 'Grey', 'Gray', 'Beige', 'Cream', 'Yellow', 'Purple',
    'Orange', 'Sage', 'Mint', 'Olive', 'Charcoal', 'Ivory', 'Taupe',
    'Aqua', 'Coral', 'Tan', 'Multi', 'Neutral', 'Metallic', 'Copper', 'Bronze', 'Rose Gold',
    'Ivy', 'Maroon', 'Dusk', 'Forest', 'Brick', 'Sky', 'Apple', 'Rose', 'Mink', 'Citrus',
    'Indigo', 'Graphite', 'Clay', 'Sand', 'Earth', 'Stone', 'Moss', 'Rust', 'Slate',
    'Ochre', 'Mustard', 'Terracotta', 'Blush', 'Peach', 'Lavender', 'Lilac', 'Mauve',
    // New Additions
    'Emerald', 'Cobalt', 'Pastel', 'Powdered', 'Breezy', 'Dream', 'Cyan', 'Magenta', 'Lime',
    'Turquoise', 'Champagne', 'Jet', 'Onyx', 'Ruby', 'Sapphire', 'Topaz', 'Amber', 'Pearl', 'Opal',
    'Violet', 'Plum', 'Orchid', 'Salmon', 'Crimson', 'Scarlet', 'Saffron', 'Lemon', 'Citron',
    'Hunter', 'Pine', 'Seafoam', 'Azure', 'Cerulean', 'Midnight', 'Ink'
];

// Combine colors and descriptors into one "removable" list for the end
// "Breezy", "Dream", "Powdered" are technically descriptors but can be treated same way.
const removables = [
    ...colors,
    'Twist', 'Mix', 'Bloom', 'Haze', 'Mist', 'Glow', 'Dream', 'Breezy', 'Powdered'
];

function getBaseName(name) {
    // 1. Remove common suffixes
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

    // 2. Iterative Stripping from End
    // We loop until the name stops changing.
    // In each iteration, we check if the string ENDS with a "Separator + Removable" 
    // or just "Removable" (if space is separator).

    let changed = true;
    while (changed) {
        changed = false;

        // Create regex for ONE removable at the end
        // Matches: SPACE + (Removable) + END
        // OR:      SPACE + (&|and|\+) + SPACE + (Removable) + END

        // optimization: join is expensive, do it once outside/cached if possible, but for this test it's fine.
        const safeRemovables = removables.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

        const pattern = new RegExp(`\\s+(?:(?:&|and|\\+)\\s+)?(${safeRemovables})$`, 'i');

        if (pattern.test(cleanName)) {
            // Check to ensure we don't strip the WHOLE name (e.g. if product is just "Cream")
            const match = cleanName.match(pattern);
            const toRemove = match[0]; // e.g. " & Teal" or " Green"

            // If stripping would leave empty string, stop.
            if (cleanName.length - toRemove.length > 0) {
                cleanName = cleanName.substring(0, cleanName.length - toRemove.length).trim();
                changed = true;
            }
        }
    }

    return cleanName;
}

console.log("--- Testing FINAL Iterative Logic ---");
testCases.forEach(name => {
    console.log(`Original: "${name}"\n  -> Base: "${getBaseName(name)}"`);
});
