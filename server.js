const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!GEMINI_API_KEY || !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.error('❌ ERRO: Variáveis ausentes. Verifique o Render.');
  process.exit(1);
}

const API_URL = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

app.get('/', (req, res) => {
  res.send('Sydi online. Use POST /webhook para enviar mensagens.');
});

app.post('/webhook', async (req, res) => {
  const { nome, whatsapp, servico } = req.body;
  
  if (!nome || !whatsapp) {
    return res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios' });
  }

  const mensagem = `Olá ${nome}! Recebemos sua solicitação para ${servico || 'registro'}. O Sydi entrará em contato.`;

  try {
    await axios.post(API_URL, {
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
    console.log(`✅ Mensagem enviada para ${nome}`);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('❌ Erro ao enviar:', error.response?.data || error.message);
    res.status(500).json({ error: 'Falha ao enviar' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sydi (Cloud API) rodando na porta ${PORT}`);
});
