
export const getBaseName = (name: string): string => {
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
    const typeRegex = /\b(Peel & Stick Wallpaper|Peel and Stick|Wall Mural|Wallpaper|Removable|Stick)\b/gi;
    clean = clean.replace(typeRegex, '').replace(/\s+/g, ' ').trim();

    return clean;
};

export const areVariants = (name1: string, name2: string): boolean => {
    return getBaseName(name1) === getBaseName(name2);
};
