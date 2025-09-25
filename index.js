const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

app.post('/gerar-link', async (req, res) => {
  const { urlProduto } = req.body;

  if (!urlProduto) {
    return res.status(400).json({ error: 'URL do produto é obrigatória' });
  }

  try {
    // Iniciar o navegador
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();

    // Definir cookies da sua sessão
    const cookies = [
      { name: 'mla-ssid', value: process.env.MLA_SSID, domain: '.mercadolivre.com.br', path: '/', httpOnly: false, secure: true },
      { name: 'meli_session', value: process.env.MELI_SESSION, domain: '.mercadolivre.com.br', path: '/', httpOnly: false, secure: true },
      { name: 'GAL', value: process.env.GAL, domain: '.mercadolivre.com.br', path: '/', httpOnly: false, secure: true },
    ];
    await page.setCookie(...cookies);

    // Acessar o gerador de links
    await page.goto('https://www.mercadolivre.com.br/afiliados/tools/link-generator', { waitUntil: 'networkidle2' });

    // Verificar se está logado
    const isLoggedIn = await page.$('#link-input');
    if (!isLoggedIn) {
      await browser.close();
      return res.status(401).json({ error: 'Sessão expirada. Atualize os cookies no Render.' });
    }

    // Preencher o campo com a URL do produto
    await page.type('#link-input', urlProduto);

    // Clicar no botão "Gerar"
    await page.click('#generate-button');

    // Esperar o link aparecer
    await page.waitForSelector('.generated-link', { timeout: 15000 });
    const linkAfiliado = await page.$eval('.generated-link', el => el.href);

    await browser.close();
    res.json({ linkAfiliado });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Falha ao gerar link. Verifique os cookies ou tente novamente.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
