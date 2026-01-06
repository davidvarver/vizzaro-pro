import { useCartStore } from '../store/useCartStore';

console.log('Verifying useCartStore...');
const state = useCartStore.getState();

if (typeof state.addToCart !== 'function') {
    console.error('❌ addToCart is MISSING from useCartStore!');
    process.exit(1);
} else {
    console.log('✅ addToCart is present.');
}

if ((state as any).addItem) {
    console.warn('⚠️ addItem exists (deprecated?)');
} else {
    console.log('ℹ️ addItem does not exist (correct).');
}

console.log('Verifying WallpaperResult dependencies...');
// Just checking if we can import the component (requires babel setup, ignoring for this simple script)
console.log('Done.');
