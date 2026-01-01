require('dotenv').config();
const { createClient } = require('@vercel/kv');
const bcrypt = require('bcryptjs');

const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

async function createAdmin() {
    const email = 'admin@vizzaro.com';
    const password = 'admin';
    const name = 'Admin Vizaro';

    console.log(`Creating admin user: ${email}`);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = {
        id: 'user_admin_master',
        email,
        name,
        passwordHash,
        isAdmin: true,
        createdAt: new Date().toISOString()
    };

    try {
        await kv.set(`user:${email}`, JSON.stringify(user));
        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
    } catch (error) {
        console.error('❌ Failed to create admin user:', error);
    }
}

createAdmin();
