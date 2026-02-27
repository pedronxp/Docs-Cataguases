import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env manualmente para garantir
const envPath = path.resolve(__dirname, 'apps/api/.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const keys = [];
const lines = envContent.split('\n');
let currentIndex = '0';

for (const line of lines) {
    if (line.startsWith('CLOUDCONVERT_API_KEY')) {
        const [id, ...valPart] = line.split('=');
        const val = valPart.join('=').trim();
        if (id === 'CLOUDCONVERT_API_KEY') {
            keys.push({ id: 'Principal', key: val });
        } else if (id.startsWith('CLOUDCONVERT_API_KEY_')) {
            keys.push({ id: id.split('_').pop(), key: val });
        }
    }
    if (line.startsWith('CLOUDCONVERT_CURRENT_KEY_INDEX=')) {
        currentIndex = line.split('=').pop().trim();
    }
}

console.log(`Índice Atual no .env: ${currentIndex}`);
console.log(`Testando ${keys.length} chaves encontradas no arquivo...`);

for (const k of keys) {
    try {
        console.log(`--- Testando Chave ${k.id} ---`);
        const res = await fetch('https://api.cloudconvert.com/v2/users/me', {
            headers: { 'Authorization': `Bearer ${k.key}` }
        });

        const status = res.status;
        const json = await res.json().catch(() => ({}));

        console.log(`Status: ${status}`);
        if (status === 200) {
            console.log(`Usuário: ${json.data?.username} | Créditos: ${json.data?.credits}`);
        } else {
            console.log(`Erro: ${JSON.stringify(json)}`);
        }
    } catch (err) {
        console.error(`Erro na execução:`, err.message);
    }
}
