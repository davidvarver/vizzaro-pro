
import { getBaseName } from '../utils/product';

const testCases = [
    "Cat Poses Emerald Peel & Stick Wallpaper",
    "Cat Poses Pink Peel & Stick Wallpaper",
    "Butterfly Wings Chartreuse Wall Mural",
    "Butterfly Wings Pastel Wall Mural",
    "Fruit and Foliage Beige Wall Mural",
    "Fruit and Foliage Apricot Wall Mural",
    "Champagne Harbor Pink Dream Peel & Stick Wallpaper",
    "Champagne Harbor Powdered Blue Peel & Stick Wallpaper"
];

console.log("--- Testing Grouping Logic ---");
testCases.forEach(name => {
    console.log(`"${name}" -> "${getBaseName(name)}"`);
});
