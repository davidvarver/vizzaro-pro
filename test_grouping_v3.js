
const names = [
    "Bygga Bo Neutral Woodland Village Wallpaper",
    "Bygga Bo Light Grey Woodland Village Wallpaper",
    "Drömma Teal Songbirds and Sunflowers Wallpaper",
    "Drōmma Light Grey Songbirds and Sunflowers Wallpaper", // Note: Drōmma vs Drömma?
    "Växa Green Rabbits & Rosehips Wallpaper",
    "Växa Light Grey Rabbits & Rosehips Wallpaper",
    "Midsommar Light Green Floral Medley Wallpaper",
    "Midsommar Sage Floral Medley Wallpaper",
    "Midsommar Dark Blue Floral Medley Wallpaper",
    "Flyga Blue Butterfly Bonanza Wallpaper",
    "Kalas Mustard Diamond Wallpaper",
    "Kalas Light Grey Diamond Wallpaper",
    "Aurora Green Geometric Wave Wallpaper",
    "Descano Exotic Plum Botanical Wallpaper",
    "Descano Flower Green Botanical Wallpaper",
    "Descano Flower Golden Green Botanical Wallpaper",
    "Marilla Blueberry Watercolor Floral Wallpaper",
    "Marilla Yellow Watercolor Floral Wallpaper",
    "Marilla Aquamarine Watercolor Floral Wallpaper",
    "Claressa Apricot Floral Wallpaper",
    "Claressa Blueberry Large Floral Wallpaper",
    "Paradise Blue Fronds Wallpaper",
    "Banning Stripe Green Geometric Wallpaper",
    "Avalon Green Weave Wallpaper",
    "Avalon Honey Weave Wallpaper",
    "Bloom Blue Floral Wallpaper",
    "Catalina Trail Green Vine Wallpaper",
    "Catalina Trail Honey Vine Wallpaper",
    "Harbour Lavender Lattice Wallpaper",
    "Harbour Golden Green Lattice Wallpaper",
    "Sanctuary Blueberry Texture Stripe Wallpaper",
    "Sanctuary Light Grey Texture Stripe Wallpaper",
    "Sanctuary Aquamarine Ombre Stripe Wallpaper",
    "Sanctuary Lavender Texture Stripe Wallpaper",
    "Sanctuary Pink Ombre Stripe Wallpaper",
    "Star Bay Blueberry Geometric Wallpaper",
    "Star Bay Gold Geometric Wallpaper",
    "Willow Blue Leaves Wallpaper",
    "Arboretum Aqua Fern Wallpaper",
    "Arboretum Honey Leaves Wallpaper", // Note: Leaves vs Fern? Visuals look different? No, arboretum might differ.
    "Natural Silver Metallic Grasscloth Wallpaper"
];

// MOCK COLORS from Store (Basic set + recent additions assumed)
// I will copy a representative set here for testing.
const COLORS = [
    // BASICS
    'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 'BROWN', 'BLACK', 'WHITE', 'GRAY', 'GREY',
    'BEIGE', 'CREAM', 'IVORY', 'GOLD', 'SILVER', 'COPPER', 'BRONZE', 'ROSE', 'TEAL', 'TURQUOISE', 'AQUA', 'NAVY',
    'INDIGO', 'VIOLET', 'LILAC', 'MAGENTA', 'FUCHSIA', 'MAROON', 'BURGUNDY', 'CRIMSON', 'SCARLET', 'CORAL', 'PEACH',
    'APRICOT', 'SALMON', 'MUSTARD', 'OCHRE', 'OLIVE', 'LIME', 'MINT', 'SAGE', 'EMERALD', 'JADE', 'CYAN', 'AZURE',
    'SKY', 'PERIWINKLE', 'LAVENDER', 'PLUM', 'MAUVE', 'TAUPE', 'TAN', 'KHAKI', 'SAND', 'RUST', 'TERRACOTTA',
    'CHARCOAL', 'SLATE', 'STEEL', 'CHAMPAGNE', 'PLATINUM', 'PEARL', 'ALABASTER', 'SNOW', 'JET', 'INK', 'MIDNIGHT',
    
    // TEXTURES (From previous update)
    'TEXTURE', 'TEXTURED', 'OGEE', 'FLORAL', 'DAMASK', 'STRIPE', 'GEOMETRIC', 'GRASSCLOTH', 'SISAL', 'WOVEN',
    'BASKETWEAVE', 'CANVAS', 'TWILL', 'DENIM', 'MARBLE', 'CONCRETE', 'MOSAIC', 'HEXAGON', 'TOILE', 'TRELLIS',
    'IKAT', 'DOT', 'CHECK', 'PLAID', 'GINGHAM', 'TARTAN',

    // NEW ADDITIONS (simulated from recent tasks)
    'BUTTER', 'SEAFOAM', 'OYSTER', 'TERRA', 'CLAY', 'DOVE', 'ESPRESSO', 'CLARET', 'VANILLA', 'EGG SHELL',
    'LICORICE', 'COLORFUL', 'GIANT', 'DECAL', 'MURAL', 'ADHESIVE', 'FILM', 'BACKSPLASH',
    'UNPASTED', 'PREPASTED', 'IRONWORK', 'SCROLL', 'ANIMAL', 'LEOPARD', 'ZEBRA', 'TIGER', 'CHEETAH',
    'PRINCESS', 'FAIRY', 'UNICORN', 'MERMAID', 'DINOSAUR', 'SPACE', 'STAR', 'MOON', 'PLANET', 'CELESTIAL',
    
    // MISSING SUSPECTS (Hypothesis)
    'BLUEBERRY', 'HONEY', 'EXOTIC', 'AQUAMARINE', 'GOLDEN'
];

function normalize(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function getGroupCurrent(name) {
    let cleanName = name.toUpperCase();
    
    // Remove "Wallpaper" suffix first
    cleanName = cleanName.replace(/\s*WALLPAPER\s*$/i, '');

    // Strip COLORS
    COLORS.forEach(color => {
        const regex = new RegExp(`\\b${color}\\b`, 'gi');
        cleanName = cleanName.replace(regex, '');
    });

    // Remove extra spaces
    cleanName = cleanName.replace(/\s+/g, ' ').trim();
    
    return normalize(cleanName);
}

function getGroupUserStrategy(name) {
    // "Everything before the first color"
    const words = name.toUpperCase().replace(/\s*WALLPAPER\s*$/i, '').split(/\s+/);
    let prefixWords = [];
    
    for (const word of words) {
        if (COLORS.includes(word)) {
            break; // Stop at first color
        }
        prefixWords.push(word);
    }
    
    if (prefixWords.length === 0) return normalize(name); // Fallback
    
    return normalize(prefixWords.join(' '));
}

console.log('--- ANALYSIS ---');
const groupsCurrent = {};
const groupsUser = {};

names.forEach(name => {
    const start = name.split(' ')[0]; // Group roughly by first word for display
    
    const gC = getGroupCurrent(name);
    const gU = getGroupUserStrategy(name);
    
    console.log(`\nName: "${name}"`);
    console.log(`   Current ID: ${gC}`);
    console.log(`   User ID:    ${gU}`);
});
