const { fetch } = require('undici');

module.exports = async (req, res) => {
    // Pega a URL do transcript da query string (ex: /api/view?url=...)
    const { url } = req.query;

    // Se nenhuma URL for fornecida, retorna um erro.
    if (!url) {
        res.status(400).send('<h1>Erro: URL do transcript não fornecida.</h1>');
        return;
    }

    try {
        // Busca o conteúdo HTML do transcript no Vercel Blob.
        const response = await fetch(url);
        if (!response.ok) {
            // Se o fetch falhar, joga um erro.
            throw new Error(`Erro ao buscar o transcript: ${response.statusText}`);
        }
        const htmlContent = await response.text();
        
        // Define o cabeçalho para 'text/html' para que o navegador renderize a página.
        res.setHeader('Content-Type', 'text/html');
        // Envia o conteúdo do transcript como resposta.
        res.status(200).send(htmlContent);

    } catch(error) {
        // Se qualquer coisa der errado, loga o erro e envia uma página de erro.
        console.error("Erro no proxy do transcript:", error);
        res.status(500).send("<h1>Erro: Não foi possível carregar o transcript.</h1>");
    }
}; 