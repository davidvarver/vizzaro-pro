
// MOCK of the Store Logic
const storeState = {
    cartItems: [],
    getSubtotal: () => 0
};

// The Function we just wrote (Adding local mock context)
function getShippingCost(subtotal, hasRolls, samplesCount) {
    // High priority: Free Shipping Threshold
    if (subtotal >= 249) {
        return 0;
    }

    if (hasRolls) {
        return 15.00;
    } else {
        return samplesCount * 0.99;
    }
}

// TESTS
console.log('🧪 TESTING SHIPPING LOGIC...\n');

// Test 1: $250 Order (Should be Free)
const test1 = getShippingCost(250, true, 0);
console.log(`Test 1 ($250 Order): Shipping = $${test1} -> ${test1 === 0 ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: $100 Order (Should be $15)
const test2 = getShippingCost(100, true, 0);
console.log(`Test 2 ($100 Order): Shipping = $${test2} -> ${test2 === 15 ? '✅ PASS' : '❌ FAIL'}`);

// Test 3: $249 EXACT (Should be Free)
const test3 = getShippingCost(249, true, 0);
console.log(`Test 3 ($249 Exact): Shipping = $${test3} -> ${test3 === 0 ? '✅ PASS' : '❌ FAIL'}`);

// Test 4: Just Samples ($10 total, 2 samples)
const test4 = getShippingCost(10, false, 2);
console.log(`Test 4 ($10 Samples): Shipping = $${test4} -> ${test4 === 1.98 ? '✅ PASS' : '❌ FAIL'}`);
