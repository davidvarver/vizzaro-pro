const jwt = require('jsonwebtoken');
const config = require('../api/config.js');

const secret = config.JWT_SECRET;
const adminSecret = config.ADMIN_SECRET_TOKEN;

if (!secret) {
    console.error('Error: JWT_SECRET not found in specific config.');
    process.exit(1);
}

// Create a dummy admin user payload
const adminUser = {
    userId: 'admin-master',
    email: 'admin@vizaro.com',
    isAdmin: true,
    role: 'admin'
};

const token = jwt.sign(adminUser, secret, { expiresIn: '7d' });

console.log('===================================================');
console.log('   ADMIN MASTER TOKEN GENERATOR');
console.log('===================================================');
console.log('');
console.log('This token allows full admin access bypassing login.');
console.log('Use this in the "Admin Token" field if prompted,');
console.log('or manually set it in localStorage as "token".');
console.log('');
console.log('---------------------------------------------------');
console.log(token);
console.log('---------------------------------------------------');
console.log('');
console.log('Valid for: 7 days');
console.log('===================================================');
