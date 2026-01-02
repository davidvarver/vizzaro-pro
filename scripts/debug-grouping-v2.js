function getBaseName(name) {
    if (!name) return '';

    // 1. Specific fix for Dream Garden and similar known patterns
    if (name.includes('Dream Garden')) return 'Dream Garden Peel & Stick Wallpaper';
    if (name.includes('Retro Esme')) return 'Retro Esme Peel & Stick Wallpaper';

    // 2. Generic Regex to strip colors and suffixes
    // List includes common colors, modifiers, and product types
    // MUST sort by length so "Powdered Blue" is matched before "Blue"
    const colorRegex = /\b(Black & White|Black and White|Off White|Powdered Blue|Pink Dream|Dream|Powdered|Emerald|Chartreuse|Apricot|Lavender|Lilac|Mauve|Peach|Coral|Salmon|Magenta|Burgundy|Maroon|Crimson|Teal|Dark Brown|Grey|Gray|Green|Blue|Red|Black|White|Gold|Silver|Beige|Navy|Pink|Yellow|Orange|Purple|Brown|Cream|Aqua|Turquoise|Charcoal|Multi|Pastel|Rainbow|Light|Dark|Hot|Deep|Soft|Sage|Olive|Mint|Rose|Mustard|Rust|Taupe|Sand|Ivory|Champagne|Bronze|Copper|Neutral|Multicolor|Metallic|Matte|Glossy|Neon|Vibrant|Muted|Pale|Bright|Warm|Cool|Earth|Jewel)\b/gi;

    // Remove colors
    let clean = name.replace(colorRegex, '');

    // Remove isolated "&" or "and" or "-" that might be left over
    clean = clean.replace(/\s+(&|and|-)\s+/gi, ' ');

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Remove Product Types (Suffixes)
    // "Peel & Stick Wallpaper", "Wall Mural", "Wallpaper", "Removable"
    const typeRegex = /\b(Peel & Stick Wallpaper|Peel and Stick|Wall Mural|Wallpaper|Removable|Stick|Peel)\b/gi;
    clean = clean.replace(typeRegex, '').replace(/\s+/g, ' ').trim();

    return clean;
}

const products = [
    "Beverly Slopes Pink Peel & Stick Wallpaper",
    "Beverly Slopes Tan Peel & Stick Wallpaper",
    "Boxanne Blue Peel & Stick Wallpaper",
    "Boxanne Tan Peel & Stick Wallpaper",
    "Water Lily Blush & Teal Peel & Stick Wallpaper",
    "Water Lily Blue Peel & Stick Wallpaper",
    "Jesinda Pink Peel & Stick Wallpaper",
    "Jesinda Cobalt Peel & Stick Wallpaper",
    "Adelia Indigo Peel & Stick Wallpaper",
    "Adelia Moss Peel & Stick Wallpaper"
];

console.log("--- Debugging Grouping V2 ---");
products.forEach(name => {
    const base = getBaseName(name);
    console.log(`Original: "${name}"\n   -> Base: "${base}"\n`);
});
