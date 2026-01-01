// scripts/update-env.js
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

const NEW_VARS = {
    'KV_REST_API_READ_ONLY_TOKEN': '"AhroAAIgcDL6QAlXY2a6_FcVal13-LcCatEIKoP0FbsVB7pZHE_brw"',
    'KV_REST_API_TOKEN': '"ARroAAImcDI1YWNjOWMzODAyZjY0YTliOTlmMDViMjNlNDllNmQ1ZnAyNjg4OA"',
    'KV_REST_API_URL': '"https://well-raptor-6888.upstash.io"',
    'KV_URL': '"rediss://default:ARroAAImcDI1YWNjOWMzODAyZjY0YTliOTlmMDViMjNlNDllNmQ1ZnAyNjg4OA@well-raptor-6888.upstash.io:6379"',
    'REDIS_URL': '"rediss://default:ARroAAImcDI1YWNjOWMzODAyZjY0YTliOTlmMDViMjNlNDllNmQ1ZnAyNjg4OA@well-raptor-6888.upstash.io:6379"',
};

let content = '';
if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
}

// Update or Append
for (const [key, value] of Object.entries(NEW_VARS)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
    } else {
        content += `\n${key}=${value}`;
    }
}

// Ensure BLOB token is preserved (it should be, but just in case)
// We won't touch other lines.

fs.writeFileSync(envPath, content, 'utf8');
console.log('✅ .env updated successfully with new KV credentials.');
