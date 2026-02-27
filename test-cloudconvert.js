const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

async function testKeys() {
    const keys = [];
    if (process.env.CLOUDCONVERT_API_KEY) keys.push({ id: 'Principal', key: process.env.CLOUDCONVERT_API_KEY });
    if (process.env.CLOUDCONVERT_API_KEY_2) keys.push({ id: '2', key: process.env.CLOUDCONVERT_API_KEY_2 });
    if (process.env.CLOUDCONVERT_API_KEY_3) keys.push({ id: '3', key: process.env.CLOUDCONVERT_API_KEY_3 });
    if (process.env.CLOUDCONVERT_API_KEY_4) keys.push({ id: '4', key: process.env.CLOUDCONVERT_API_KEY_4 });

    console.log(`Testando ${keys.length} chaves...`);

    for (const k of keys) {
        try {
            const res = await fetch('https://api.cloudconvert.com/v2/users/me', {
                headers: { 'Authorization': `Bearer ${k.key.trim()}` }
            });
            const text = await res.text();
            console.log(`Chave ${k.id}: Status ${res.status}`);
            console.log(`Resposta: ${text.substring(0, 100)}...`);
        } catch (err) {
            console.error(`Erro na chave ${k.id}:`, err.message);
        }
    }
}

testKeys();
