const { getBaseName } = require('../utils/product');

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

console.log("--- Debugging Grouping ---");
products.forEach(name => {
    const base = getBaseName(name);
    console.log(`Original: "${name}"\n   -> Base: "${base}"\n`);
});
