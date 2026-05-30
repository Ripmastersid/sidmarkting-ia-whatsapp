const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Variáveis de ambiente (configuradas no Render)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Validação inicial
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY não definida. Configure no Render.');
  process.exit(1);
}
if (!WHATSAPP_TOKEN) {
  console.error('❌ WHATSAPP_TOKEN não definida. Configure no Render.');
  process.exit(1);
}
if (!WHATSAPP_PHONE_NUMBER_ID) {
  console.error('❌ WHATSAPP_PHONE_NUMBER_ID não definida. Configure no Render.');
  process.exit(1);
}

const WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Rota raiz (teste rápido)
app.get('/', (req, res) => {
  res.send('Sydi está online. Use POST /webhook para enviar mensagens.');
});

// Webhook para recebimento de leads
app.post('/webhook', async (req, res) => {
  const { nome, whatsapp, servico } = req.body;

  // Validação mínima
  if (!nome || !whatsapp) {
    return res.status(400).json({ error: 'nome e whatsapp são obrigatórios' });
  }

  const mensagem = `Olá ${nome}! Recebemos sua solicitação para ${servico || 'registro de marca'}. O Sid entrará em contato em breve.`;

  try {
    await axios.post(WHATSAPP_API_URL, {
      messaging_product: 'whatsapp',
      to: whatsapp,
      type: 'text',
      text: { body: mensagem }
    }, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Mensagem enviada para ${nome} (${whatsapp})`);
    res.status(200).json({ status: 'success', message: 'Mensagem enviada' });
  } catch (error) {
    console.error('❌ Erro ao enviar:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao enviar mensagem' });
  }
});

// Porta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sydi (WhatsApp Cloud API) rodando na porta ${PORT}`);
});
