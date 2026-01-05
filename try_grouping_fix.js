
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
    "Paradise Indigo & Pink Peel and Stick Wallpaper",
    // Regression tests
    "Retro Esme Aqua Peel & Stick Wallpaper",
    "Dream Garden Blue"
];

const colors = [
    // Original list
    'Off White', 'Dark Brown', 'Light Brown', 'Light Blue', 'Dark Blue',
    'Black & White', 'Black and White',
    'Navy', 'Teal', 'Pink', 'Blue', 'Green', 'Red', 'Black', 'White',
    'Gold', 'Silver', 'Grey', 'Gray', 'Beige', 'Cream', 'Yellow', 'Purple',
    'Orange', 'Sage', 'Mint', 'Olive', 'Charcoal', 'Ivory', 'Taupe',
    'Aqua', 'Coral', 'Tan', 'Multi', 'Neutral', 'Metallic', 'Copper', 'Bronze', 'Rose Gold',
    // New additions based on screenshots
    'Ivy', 'Maroon', 'Dusk', 'Forest', 'Brick', 'Sky', 'Apple', 'Rose', 'Mink', 'Citrus',
    'Indigo', 'Graphite', 'Clay', 'Sand', 'Earth', 'Stone', 'Moss', 'Rust', 'Slate',
    'Ochre', 'Mustard', 'Terracotta', 'Blush', 'Peach', 'Lavender', 'Lilac', 'Mauve'
];

const descriptors = ['Twist', 'Mix', 'Bloom', 'Haze', 'Mist', 'Glow'];

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

    // 2. Generic "Word & Word" or "Word and Word" stripper at the end
    // Matches: "Apple & Rose", "Brick and Sky", "Indigo & Pink"
    // Requirement: The words must be capitalized or simple text, and at the end.
    // We run this BEFORE single color stripping to catch the complex ones first.
    // Regex: Space + Word + Space + (&/and/+) + Space + Word + End
    const comboRegex = /\s+([a-zA-Z]+)\s+(&|and|\+)\s+([a-zA-Z]+)$/i;

    // Safety check: ensure we don't reduce the name to empty or just 1 word if it was 3 words (e.g. "Owl and Willow")
    // But since we removed "Peel & Stick...", current name is "Oasis Apple & Rose".
    // If we match "Apple & Rose", we strip it -> "Oasis". Good.
    // If name is "Owl & Willow", we match "Owl & Willow" -> "". Bad.

    if (comboRegex.test(cleanName)) {
        const potentialStrip = cleanName.replace(comboRegex, '').trim();
        if (potentialStrip.length > 0) {
            cleanName = potentialStrip;
        }
    }

    // 3. Descriptor stripping (e.g. "Twist", "Mix" at end)
    // Often preceded by a color, e.g. "Navy Twist", "Forest Mix".
    // We can strip just the descriptor, then the color loop will catch the color.
    const descriptorRegex = new RegExp(`\\s+(${descriptors.join('|')})$`, 'i');
    cleanName = cleanName.replace(descriptorRegex, '').trim();

    // 4. Remove common colors from the end (Iterative)
    // We loop because sometimes there are multiple color words, e.g. "Dark Blue" (handled by list), 
    // but maybe "Blue Green"?
    // The current list has specific multi-words like "Light Blue".
    // Let's stick to the single pass with the massive list, or maybe repeatable?
    // "Navy Twist" -> "Navy" (Twist removed above) -> "" (if name was Navy? No).

    const colorRegex = new RegExp(`\\s+(${colors.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i');

    // Run twice to handle thinks like "Dark Blue" if "Blue" and "Dark" were separate? 
    // But "Dark Blue" is in the list.
    // What about "Brick" (removed) then "Red" (removed)? Unlikely.
    // Just one pass should suffice if the list is good.
    cleanName = cleanName.replace(colorRegex, '').trim();

    return cleanName;
}

console.log("--- Testing NEW Aggressive Logic ---");
testCases.forEach(name => {
    console.log(`Original: "${name}"\n  -> Base: "${getBaseName(name)}"`);
});
