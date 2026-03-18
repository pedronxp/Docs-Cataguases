const content = '{"type": "function", "name": "listar_modelos", "parameters": {}}';
let tool_calls = null;
let parsedContent = content;

if (!tool_calls && parsedContent && parsedContent.includes('"type":') && parsedContent.includes('"name":')) {
    try {
        const cleanJson = parsedContent.replace(/^```(json)?/, '').replace(/```$/, '').trim()
        if (cleanJson.startsWith('{') && cleanJson.endsWith('}')) {
            const parsed = JSON.parse(cleanJson)
            if ((parsed.type === 'function' || parsed.function) && parsed.name) {
                tool_calls = [{
                    id: 'call_' + Math.random().toString(36).slice(2, 9),
                    type: 'function',
                    function: {
                        name: parsed.name,
                        arguments: typeof parsed.parameters === 'object' ? JSON.stringify(parsed.parameters) : (parsed.parameters || parsed.arguments || '{}')
                    }
                }]
                parsedContent = '' // Zera o content
            }
        }
    } catch (e) {
        console.error(e)
    }
}
console.log({ tool_calls, parsedContent });
