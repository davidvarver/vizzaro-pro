
export const getBaseName = (name: string): string => {
    if (!name) return '';

    // 1. Specific fix for Dream Garden and similar known patterns
    if (name.includes('Dream Garden')) return 'Dream Garden Peel & Stick Wallpaper';
    if (name.includes('Retro Esme')) return 'Retro Esme Peel & Stick Wallpaper';

    // 2. Generic Regex to strip colors and "Peel & Stick Wallpaper" suffix
    // List includes common colors and modifiers (Put multi-word ones like "Black & White" first!)
    const colorRegex = /\b(Black & White|Black and White|Off White|Teal|Dark Brown|Grey|Gray|Green|Blue|Red|Black|White|Gold|Silver|Beige|Navy|Pink|Yellow|Orange|Purple|Brown|Cream|Aqua|Turquoise|Charcoal|Multi|Pastel|Rainbow|Light|Dark|Hot|Deep|Soft|Sage|Olive|Mint|Rose|Mustard|Rust|Taupe|Sand|Ivory|Champagne|Bronze|Copper|Neutral|Multicolor)\b/gi;

    // Remove colors
    let clean = name.replace(colorRegex, '');

    // Remove isolated "&" or "and" that might be left over (e.g. from "Blue & Gold" if only Blue matched?)
    // Actually, "Black & White" is handled above. But "Blue & Green" might leave "&".
    clean = clean.replace(/\s+(&|and)\s+/gi, ' ');

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Ensure "Peel & Stick Wallpaper" is consistent (it might have been touched if it contained a color word?)
    // No, "Peel" and "Stick" are not colors. "Wallpaper" is not.

    return clean;
};

export const areVariants = (name1: string, name2: string): boolean => {
    return getBaseName(name1) === getBaseName(name2);
};
