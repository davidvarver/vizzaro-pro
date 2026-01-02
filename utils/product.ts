
export const getBaseName = (name: string): string => {
    if (!name) return '';

    // 1. Specific fix for Dream Garden and similar known patterns
    if (name.includes('Dream Garden')) return 'Dream Garden Peel & Stick Wallpaper';
    if (name.includes('Retro Esme')) return 'Retro Esme Peel & Stick Wallpaper';

    // 2. Generic Regex to strip colors and "Peel & Stick Wallpaper" suffix
    // List includes common colors and modifiers
    const colorRegex = /\b(Off White|Teal|Dark Brown|Grey|Gray|Green|Blue|Red|Black|White|Gold|Silver|Beige|Navy|Pink|Yellow|Orange|Purple|Brown|Cream|Aqua|Turquoise|Charcoal|Multi|Pastel|Rainbow|Light|Dark|Hot|Deep|Soft|Sage|Olive|Mint|Rose|Mustard|Rust|Taupe|Sand|Ivory|Champagne|Bronze|Copper)\b/gi;

    let clean = name.replace(colorRegex, '').replace(/\s+/g, ' ').trim();

    // Optional: distinct duplicate "Peel & Stick Wallpaper" if it remains or duplicate spaces
    clean = clean.replace(/Peel & Stick Wallpaper/gi, 'Peel & Stick Wallpaper').replace(/\s+/g, ' ').trim();

    return clean;
};

export const areVariants = (name1: string, name2: string): boolean => {
    return getBaseName(name1) === getBaseName(name2);
};
