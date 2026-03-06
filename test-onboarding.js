const axios = require('axios');

async function testarFluxo() {
    try {
        console.log('1. Registrando usuário...');
        const str = Date.now().toString(36);
        const resReg = await axios.post('http://localhost:3000/api/auth/registro', {
            name: 'Teste Integracao ' + str,
            username: 'teste.integracao.' + str,
            email: `integracao${str}@example.com`,
            password: 'senha'
        });

        console.log('Registro com sucesso:', resReg.data);
        const token = resReg.data.token;

        console.log('\n2. Buscando secretarias...');
        const resSec = await axios.get('http://localhost:3000/api/admin/config/secretarias', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const secretarias = resSec.data.data;
        if (secretarias.length === 0) {
            console.log('Nenhuma secretaria cadastrada no banco. Teste abortado.');
            return;
        }

        const secretariaId = secretarias[0].id;
        console.log('Secretaria selecionada:', secretariaId);

        console.log('\n3. Buscando setores da secretaria...');
        const resSetores = await axios.get(`http://localhost:3000/api/admin/config/secretarias/${secretariaId}/setores`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const setores = resSetores.data.data;
        const setorId = setores.length > 0 ? setores[0].id : undefined;
        console.log('Setor selecionado (opcional):', setorId || 'Nenhum');

        console.log('\n4. Completando Onboarding com o ID CUID...');
        const payload = { secretariaId };
        if (setorId) payload.setorId = setorId;

        const resOnb = await axios.patch('http://localhost:3000/api/auth/onboarding', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Onboarding com sucesso:', resOnb.data);
        console.log('✅ TESTE FINALIZADO COM SUCESSO. A CORREÇÃO FUNCIONA!');

    } catch (err) {
        if (err.response) {
            console.error('❌ ERRO NA API:', err.response.status, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('❌ ERRO DESCONHECIDO:', err.message);
        }
    }
}

testarFluxo();
