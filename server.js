const express = require('express');
const axios = require('axios');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

// Configurações (vêm do Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '5521966053200';

let sock;

async function conectarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true 
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'close') {
      console.log('Conexão fechada. Reconectando...');
      conectarWhatsApp();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado com sucesso!');
    }
  });
}

// Função para gerar resposta com Gemini
async function gerarResposta(nome, marca, plano, servico) {
  const links = {
    ebooks: 'https://quiz.sidmarkting.com.br/',
    produtos: 'https://sidmarketing-products.vercel.app/',
    registro: 'https://sidmarkting-registro.vercel.app',
    sites: 'https://sidmarkting-sites-oficiais.vercel.app'
  };

  let prompt = `Você é Sydi, assistente virtual jurídico da Sidmarkting. Responda com 2 frases curtas, formais e acolhedoras.

Cliente: ${nome}
Serviço solicitado: ${servico}

Regras:
- Se for "ebooks", diga: "Conheça nossos e-books sobre propriedade intelectual:" + link
- Se for "produtos", diga: "Acesse nossa loja de produtos:" + link
- Se for "registro", confirme recebimento da procuração e diga que Sid analisará em 24h
- Se for "sites", diga: "Veja os planos de sites:" + link
- Nunca mencione IA, robô ou afiliação
- Use português claro e profissional`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    // Fallback seguro (sem IA)
    const fallbacks = {
      registro: `Olá ${nome}! Recebemos sua solicitação para registrar a marca "${marca}". O Sid já foi notificado e entrará em contato em até 24h.`,
      sites: `Olá ${nome}! Veja os planos de sites: ${links.sites}`,
      ebooks: `Olá ${nome}! Conheça nossos e-books: ${links.ebooks}`,
      produtos: `Olá ${nome}! Acesse nossa loja: ${links.produtos}`
    };
    return fallbacks[servico] || `Olá ${nome}! Recebemos sua mensagem. O Sid entrará em contato em breve.`;
  }
}

app.post('/webhook', async (req, res) => {
  const { nome, whatsapp, marca, plano, servico } = req.body;
  const numeroCliente = `${whatsapp}@s.whatsapp.net`;

  try {
    const mensagem = await gerarResposta(nome, marca, plano, servico || 'registro');
    await sock.sendMessage(numeroCliente, { text: mensagem });
    console.log(`✅ Mensagem enviada para ${nome}`);
    res.status(200).send({ status: "Sucesso" });
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).send({ error: "Falha no envio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sydi rodando na porta ${PORT}`);
  conectarWhatsApp();
});
