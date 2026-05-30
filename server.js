const express = require('express');
const axios = require('axios');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

// ⚠️ Nenhuma chave aqui — só leitura das variáveis de ambiente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER;

if (!GEMINI_API_KEY) {
  console.error('❌ ERRO: GEMINI_API_KEY não definida. Configure no Render.');
  process.exit(1);
}
if (!WHATSAPP_NUMBER) {
  console.error('❌ ERRO: WHATSAPP_NUMBER não definida. Configure no Render.');
  process.exit(1);
}

let sock;

async function conectarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true 
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    
    if (qr) {
      console.log('\n\n--- QR CODE PARA WHATSAPP ---\n');
      qrcode.generate(qr, { small: true });
      console.log('\nEscaneie com: WhatsApp > Menu > WhatsApp Web\n');
    }
    
    if (connection === 'open') {
      console.log('✅ WhatsApp conectado!');
    }
  });
}

// Rota de teste (não remove)
app.get('/', (req, res) => {
  res.send('Sydi está online. Verifique os logs para o QR code.');
});

// Webhook para recebimento de leads
app.post('/webhook', async (req, res) => {
  const { nome, whatsapp, marca, plano, servico } = req.body;
  const numeroCliente = `${whatsapp}@s.whatsapp.net`;

  try {
    const mensagem = `Olá ${nome}! Recebemos sua solicitação para ${servico || 'registro de marca'}. O Sid entrará em contato em breve.`;
    await sock.sendMessage(numeroCliente, { text: mensagem });
    res.status(200).send({ status: "Sucesso" });
  } catch (error) {
    console.error("Erro:", error.message);
    res.status(500).send({ error: "Falha no envio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sydi rodando na porta ${PORT}`);
  conectarWhatsApp(); // Inicia conexão imediatamente
});
