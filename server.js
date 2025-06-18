const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// Configuração de logs
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

if (process.env.RENDER) {
  logger.info("✅ Rodando no Render.com");
}

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(express.static('public'));

// Inicialização do cliente WhatsApp
const client = new Client({
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disk-cache-size=10000000',     // Limite de 10MB para cache de disco
      '--aggressive-cache-discard'      // Descarte seletivo de cache quando possível
    ],
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 10, height: 10 }
  },
  session: fs.existsSync('./session.json') ? JSON.parse(fs.readFileSync('./session.json')) : null,
  restartOnConflict: true,
  takeoverOnConflict: true
});

// Estrutura para armazenar dados dos clientes
let carrinhos = {};

// Limpeza de carrinhos inativos a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [sender, data] of Object.entries(carrinhos)) {
    if (now - (data.ultimaInteracao || now) > 600000) { // 10 minutos
      delete carrinhos[sender];
      logger.info(`♻️ Carrinho de ${sender} removido por inatividade (10min)`);
    }
  }
}, 300000); // Verificação a cada 5 minutos

const cardapio = {
  lanches: [
    { id: 1, nome: " Smash Burger Clássico", preco: 20.00 },
    { id: 2, nome: " Smash! Salada", preco: 23.00 },
    { id: 3, nome: " Salada Bacon", preco: 27.00 },
    { id: 4, nome: " Smash!! Triple", preco: 28.00 },
    { id: 5, nome: " Smash Burger Bacon", preco: 29.99 },
    { id: 6, nome: " Burger Calabacon", preco: 32.99 }
  ],
  bebidas: [
    { id: 7, nome: " Coca-Cola 2L", preco: 12.00 },
    { id: 8, nome: " Poty Guaraná 2L", preco: 10.00 },
    { id: 9, nome: " Coca-Cola Lata", preco: 6.00 },
    { id: 10, nome: " Guaraná Lata", preco: 6.00 }
  ]
};

const PDF_PATH = path.join(__dirname, 'public', 'cardapio.pdf');

// Funções auxiliares
function formatarTroco(troco) {
  if (!troco || typeof troco !== 'string') return 'não';
  const clean = troco.toLowerCase().trim();
  if (clean === 'não' || clean === 'nao') return 'não';
  const numeros = clean.replace(/[^\d.,]/g, '');
  if (numeros) {
    const valor = parseFloat(numeros.replace(',', '.'));
    if (!isNaN(valor)) {
      return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }
  }
  return 'não';
}

function calcularTotal(itens) {
  return itens.reduce((sum, item) => sum + item.preco, 0);
}

function formatarMoeda(valor) {
  return valor.toFixed(2).replace('.', ',');
}

function removerEmojis(texto) {
  return texto.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim();
}

function gerarCupomFiscal(itens, endereco, formaPagamento = null, troco = null, observacao = null, cliente = null) {
  const subtotal = calcularTotal(itens);
  const taxaEntrega = subtotal * 0.1;
  const total = subtotal + taxaEntrega;
  const now = new Date();
  let cupom = "==================================================\n";
  cupom += `           DOKA BURGER - Pedido em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
  cupom += "==================================================\n";
  if (cliente) {
    cupom += "👤 *DADOS DO CLIENTE*\n";
    cupom += `Nome: ${cliente.nome}\n`;
    cupom += `Telefone: ${cliente.telefone}\n`;
  }
  cupom += "ITENS:\n";
  itens.forEach(item => {
    const nomeSemEmoji = removerEmojis(item.nome);
    cupom += `• ${nomeSemEmoji.padEnd(35)} R$ ${formatarMoeda(item.preco)}\n`;
  });
  cupom += "--------------------------------------------------\n";
  cupom += `Subtotal:         R$ ${formatarMoeda(subtotal)}\n`;
  cupom += `Taxa de Entrega:  R$ ${formatarMoeda(taxaEntrega)}\n`;
  cupom += `TOTAL:            R$ ${formatarMoeda(total)}\n`;
  cupom += "--------------------------------------------------\n";
  cupom += "ENDEREÇO:\n";
  cupom += `${endereco}\n`;
  cupom += "--------------------------------------------------\n";
  cupom += "FORMA DE PAGAMENTO:\n";
  cupom += `${formaPagamento}\n`;
  if (formaPagamento === "1. Dinheiro 💵" && troco) {
    cupom += `Troco para: ${formatarTroco(troco)}\n`;
  }
  cupom += "--------------------------------------------------\n";
  cupom += "OBSERVAÇÃO:\n";
  cupom += `${observacao || "Nenhuma"}\n`;
  cupom += "==================================================\n";
  cupom += "           OBRIGADO PELA PREFERÊNCIA!";
  return cupom;
}

function mostrarCardapio() {
  let msg = "🌟 *CARDÁPIO DOKA BURGER* 🌟\n";
  msg += "══════════════════════════\n";
  msg += "🍔 *LANCHES*\n";
  msg += "══════════════════════════\n";
  cardapio.lanches.forEach(item => {
    msg += `🔹 *${item.id}* ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
  });
  msg += "══════════════════════════\n";
  msg += "🥤 *BEBIDAS*\n";
  msg += "══════════════════════════\n";
  cardapio.bebidas.forEach(item => {
    msg += `🔹 *${item.id}* ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
  });
  msg += "══════════════════════════\n";
  msg += "🔢 Digite o *NÚMERO* do item desejado:";
  return msg;
}

function mostrarOpcoes() {
  return "✨ *O QUE DESEJA FAZER?* ✨\n" +
         "══════════════════════════\n" +
         "1️⃣  Escolher seu lanche\n" +
         "2️⃣  Finalizar compra\n" +
         "3️⃣  Cancelar pedido\n" +
         "4️⃣  Falar com atendente\n" +
         "5️⃣  📄 Ver Cardápio (PDF)\n" +
         "6️⃣  ✏️ Editar pedido\n" +
         "══════════════════════════\n" +
         "🔢 Digite o número da opção:";
}

async function mostrarCarrinhoParaEdicao(sender) {
  let mensagem = "✏️ *EDIÇÃO DE PEDIDO* ✏️\n";
  mensagem += "🛒 *ITENS NO CARRINHO:*\n";
  carrinhos[sender].itens.forEach((item, index) => {
    mensagem += `*${index + 1}.* ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
  });
  mensagem += "\n🔢 *Digite o número do item que deseja REMOVER* ou\n";
  mensagem += "0️⃣  *Voltar ao menu anterior*";
  await client.sendMessage(sender, mensagem);
}

// Eventos do WhatsApp
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=15&data=${encodeURIComponent(qr)}`;
  logger.info('\n📢 QR Code alternativo (caso não consiga ler acima):');
  logger.info(qrLink);
  logger.info('⏳ Válido por 60 segundos\n');
});

client.on('ready', () => {
  logger.info('🤖 Bot pronto e operacional!');
  logger.info(`🕒 Última inicialização: ${new Date().toLocaleTimeString()}`);
});

client.on('message', async message => {
  const text = message.body.trim();
  const sender = message.from;
  const agora = Date.now();

  // Tratamento especial para saudações
  if (text.toLowerCase() === 'oi' || text.toLowerCase() === 'olá' || text.toLowerCase() === 'ola') {
    if (!carrinhos[sender]) {
      carrinhos[sender] = { 
        itens: [], 
        estado: "opcoes",
        ultimaInteracao: agora,
        nomeCliente: message._data.notifyName || "Cliente"
      };
    } else {
      carrinhos[sender].estado = "opcoes";
    }
    await client.sendMessage(sender, "🍔🔥 *Bem-vindo ao nosso universo de sabor!* Cada mordida é uma explosão de felicidade. Preparado para essa experiência incrível? 😃 aberto das 18:00 as 23:00");
    await client.sendMessage(sender, mostrarOpcoes());
    return;
  }

  // Captura nome do cliente na primeira mensagem
  if (!carrinhos[sender]) {
    carrinhos[sender] = { 
      itens: [], 
      estado: "opcoes",
      ultimaInteracao: agora,
      nomeCliente: message._data.notifyName || "Cliente"
    };
    logger.info(`👤 Novo cliente registrado: ${carrinhos[sender].nomeCliente} (${sender})`);
  } else {
    carrinhos[sender].ultimaInteracao = agora;
  }

  if (carrinhos[sender].atendenteTimer && (agora - carrinhos[sender].atendenteTimer < 600000)) {
    return;
  } else if (carrinhos[sender].atendenteTimer) {
    carrinhos[sender].atendenteTimer = null;
    carrinhos[sender].estado = "opcoes";
    await client.sendMessage(sender, "⏳ *O período de atendimento humano terminou*\nComo posso ajudar?");
    await client.sendMessage(sender, mostrarOpcoes());
    return;
  }

  if (text.toLowerCase() === 'cliente') {
    carrinhos[sender] = { 
      itens: [], 
      estado: "escolhendo", 
      ultimaInteracao: agora,
      nomeCliente: carrinhos[sender].nomeCliente
    };
    await client.sendMessage(sender, "🔄 *Reiniciando seu pedido...*");
    await client.sendMessage(sender, mostrarCardapio());
    return;
  }

  if (carrinhos[sender].estado === "inicio" || carrinhos[sender].estado === "pos_compra") {
    carrinhos[sender].estado = "opcoes";
    await client.sendMessage(sender, "🍔🔥 *Bem-vindo ao nosso universo de sabor!* 😃 Aberto das 18:00 às 23:00");
    await client.sendMessage(sender, mostrarOpcoes());
    return;
  }

  if (carrinhos[sender].estado === "escolhendo") {
    const numeroItem = parseInt(text);
    const todosItens = [...cardapio.lanches, ...cardapio.bebidas];
    const itemSelecionado = todosItens.find(item => item.id === numeroItem);
    if (itemSelecionado) {
      carrinhos[sender].itens.push(itemSelecionado);
      carrinhos[sender].estado = "opcoes";
      let mensagemCarrinho = `✅ *${itemSelecionado.nome}* adicionado ao carrinho!\n`;
      mensagemCarrinho += `💰 Valor: R$ ${formatarMoeda(itemSelecionado.preco)}\n`;
      mensagemCarrinho += "🛒 *SEU CARRINHO ATUAL:\n";
      carrinhos[sender].itens.forEach((item, index) => {
        mensagemCarrinho += `➡️ ${index + 1}. ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
      });
      await client.sendMessage(sender, mensagemCarrinho);
      await client.sendMessage(sender, mostrarOpcoes());
    } else {
      await client.sendMessage(sender, 
        "❌ *Item não encontrado!*\n🔢 Por favor, digite apenas o número do item conforme o cardápio:"
      );
      await client.sendMessage(sender, mostrarCardapio());
    }
    return;
  }

  if (carrinhos[sender].estado === "opcoes") {
    const opcao = parseInt(text);
    if (isNaN(opcao)) {
      await client.sendMessage(sender, "⚠️ *OPÇÃO INVÁLIDA!*\nPor favor, digite apenas o número da opção desejada:");
      await client.sendMessage(sender, mostrarOpcoes());
      return;
    }

    switch (text) {
      case "1":
        carrinhos[sender].estado = "escolhendo";
        await client.sendMessage(sender, "📝 *Adicionando itens...*");
        await client.sendMessage(sender, mostrarCardapio());
        break;
      case "2":
        if (carrinhos[sender].itens.length === 0) {
          await client.sendMessage(sender, "🛒 *Seu carrinho está vazio!* Adicione itens antes de finalizar.");
          return;
        }
        carrinhos[sender].estado = "perguntando_observacao";
        await client.sendMessage(sender,
          "📝 *DESEJA ADICIONAR ALGUMA OBSERVAÇÃO?*\n" +
          "Ex: sem cebola, ponto da carne, etc.\n" +
          "1. Sim\n2. Não\n🔢 Digite o número da opção:"
        );
        break;
      case "3":
        carrinhos[sender].estado = "confirmando_cancelamento";
        await client.sendMessage(sender, 
          "⚠️ *CANCELAMENTO DE PEDIDO* ⚠️\n" +
          "🔥 Seu pedido está indo para chapa!\nMas antes, confirme se realmente quer fazer isso...\n" +
          "Você perderá:\n• Hambúrgueres suculentos\n• Combos incríveis\n• Momentos de felicidade\n" +
          "________________________________\n" +
          "🛑 *CONFIRME O CANCELAMENTO:\n1. ✅ Sim, cancelar tudo\n2. ❌ Não, quero continuar\n" +
          "________________________________\n" +
          "🔢 Digite o número da opção:"
        );
        break;
      case "4":
        carrinhos[sender].atendenteTimer = agora;
        await client.sendMessage(sender,
          "👨‍🍳 *ATENDENTE HUMANO ACIONADO!*\nVocê será atendido por um de nossos especialistas em hambúrgueres!\n" +
          "⏳ Tempo de atendimento: 10 minutos\n⏰ Após esse período, retornaremos ao modo automático"
        );
        break;
      case "5":
        if (fs.existsSync(PDF_PATH)) {
          const media = MessageMedia.fromFilePath(PDF_PATH);
          await client.sendMessage(sender, media, { caption: '📄 *Cardápio Completo Smash Burger!*' });
          carrinhos[sender].ultimoEnvioPdf = agora;
        } else {
          await client.sendMessage(sender, "⚠️ *Cardápio temporariamente indisponível.*");
        }
        await client.sendMessage(sender, mostrarOpcoes());
        break;
      case "6":
        if (carrinhos[sender].itens.length === 0) {
          await client.sendMessage(sender, "🛒 *Seu carrinho está vazio!*");
          await client.sendMessage(sender, mostrarOpcoes());
          return;
        }
        carrinhos[sender].estado = "editando_pedido";
        await mostrarCarrinhoParaEdicao(sender);
        break;
      default:
        await client.sendMessage(sender, 
          "⚠️ *OPÇÃO INVÁLIDA!*\nPor favor, escolha uma das opções abaixo:"
        );
        await client.sendMessage(sender, mostrarOpcoes());
        break;
    }
    return;
  }

  if (carrinhos[sender].estado === "editando_pedido") {
    if (text === "0") {
      carrinhos[sender].estado = "opcoes";
      await client.sendMessage(sender, "↩️ Voltando ao menu principal...");
      await client.sendMessage(sender, mostrarOpcoes());
    } else {
      const index = parseInt(text) - 1;
      if (index >= 0 && index < carrinhos[sender].itens.length) {
        const itemRemovido = carrinhos[sender].itens.splice(index, 1)[0];
        await client.sendMessage(sender, `❌ *${itemRemovido.nome}* removido do carrinho!`);
        if (carrinhos[sender].itens.length > 0) {
          await mostrarCarrinhoParaEdicao(sender);
        } else {
          await client.sendMessage(sender, "🛒 *Carrinho vazio!*");
          carrinhos[sender].estado = "opcoes";
          await client.sendMessage(sender, mostrarOpcoes());
        }
      } else {
        await client.sendMessage(sender, "❌ *Número inválido!* Por favor, digite o número do item ou 0 para voltar.");
      }
    }
    return;
  }

  if (carrinhos[sender].estado === "perguntando_observacao") {
    if (text === "1") {
      carrinhos[sender].estado = "aguardando_observacao";
      await client.sendMessage(sender, 
        "✍️ *POR FAVOR, DIGITE SUA OBSERVAÇÃO:*\nEx: Sem cebola, carne bem passada, etc."
      );
    } else if (text === "2") {
      carrinhos[sender].observacao = null;
      carrinhos[sender].estado = "aguardando_endereco";
      await client.sendMessage(sender,
        "🏠 *INFORME SEU ENDEREÇO*\nPor favor, envie:\n" +
        "🧩  Rua, Número\n" +
        "🏘️  Bairro\n" +
        "📌  Ponto de referência\n" +
        "🏆 *Exemplo:* \nRua das Flores, 123    Bairro Centro    Próximo ao mercado"
      );
    } else {
      await client.sendMessage(sender, 
        "❌ *OPÇÃO INVÁLIDA!*\nDigite:\n1. Sim\n2. Não"
      );
    }
    return;
  }

  if (carrinhos[sender].estado === "aguardando_observacao") {
    carrinhos[sender].observacao = text;
    carrinhos[sender].estado = "aguardando_endereco";
    await client.sendMessage(sender, "✅ Observação salva com sucesso!");
    await client.sendMessage(sender,
      "🏠 *INFORME SEU ENDEREÇO*\nPor favor, envie:\n" +
      "🧩  Rua, Número\n" +
      "🏘️  Bairro\n" +
      "📌  Ponto de referência\n" +
      "🏆 *Exemplo:* \nRua das Flores, 123    Bairro Centro    Próximo ao mercado"
    );
    return;
  }

  if (carrinhos[sender].estado === "confirmando_cancelamento") {
    if (text === "1") {
      carrinhos[sender] = { 
        itens: [], 
        estado: "inicio", 
        ultimaInteracao: agora,
        nomeCliente: carrinhos[sender].nomeCliente
      };
      await client.sendMessage(sender, 
        "🗑️ *PEDIDO CANCELADO!*\n😢 Estamos tristes em vê-lo partir!\n⚡ Mas sempre que quiser voltar, estamos aqui!\n🔄 Digite *'cliente'* para recomeçar!"
      );
    } else if (text === "2") {
      carrinhos[sender].estado = "opcoes";
      await client.sendMessage(sender, 
        "🎉 *PEDIDO MANTIDO!*\n🌟 Excelente escolha! Seu PEDIDO está salvo!\n👏 Continue com sua experiência gastronômica!\n💬 para Finalizar sua compra digite 02"
      );
      await client.sendMessage(sender, mostrarOpcoes());
    } else {
      await client.sendMessage(sender, 
        "❌ *OPÇÃO INVÁLIDA!*\nPor favor, escolha:\n1. ✅ Sim, cancelar tudo\n2. ❌ Não, quero continuar"
      );
    }
    return;
  }

  if (carrinhos[sender].estado === "aguardando_endereco") {
    if (text.length < 10) {
      await client.sendMessage(sender, "📢 *Endereço incompleto!*\nPor favor, informe rua, número e bairro.");
      return;
    }
    carrinhos[sender].endereco = text;
    const subtotal = calcularTotal(carrinhos[sender].itens);
    const taxaEntrega = subtotal * 0.1;
    const valorTotal = subtotal + taxaEntrega;
    await client.sendMessage(sender,
      "💳 *FORMA DE PAGAMENTO* 💳\n" +
      `💰 *TOTAL DO PEDIDO: R$ ${formatarMoeda(valorTotal)}*\n(Itens: R$ ${formatarMoeda(subtotal)} + Entrega: R$ ${formatarMoeda(taxaEntrega)})\n` +
      "1. Dinheiro 💵\n2. PIX 📱\n3. Cartão 💳\n4. ❌ Cancelar pedido\n" +
      "🔢 Digite o número da opção:"
    );
    carrinhos[sender].estado = "escolhendo_pagamento";
    return;
  }

  if (carrinhos[sender].estado === "escolhendo_pagamento") {
    const formas = {
      "1": "1. Dinheiro 💵",
      "2": "2. PIX 📱",
      "3": "3. Cartão 💳",
      "4": "4. ❌ Cancelar pedido"
    };
    if (formas[text]) {
      if (text === "4") {
        carrinhos[sender].estado = "confirmando_cancelamento";
        await client.sendMessage(sender, 
          "⚠️ *CANCELAMENTO DE PEDIDO* ⚠️\n🔥 Seu pedido está prestes a ser cancelado!\nConfirme se realmente deseja cancelar:\n" +
          "________________________________\n" +
          "🛑 *CONFIRME O CANCELAMENTO:\n1. ✅ Sim, cancelar tudo\n2. ❌ Não, quero continuar\n" +
          "________________________________\n" +
          "🔢 Digite o número da opção:"
        );
        return;
      }
      carrinhos[sender].formaPagamento = formas[text];
      if (text === "1") {
        carrinhos[sender].estado = "aguardando_troco";
        await client.sendMessage(sender, 
          "💵 *Pagamento em dinheiro selecionado*\n🔄 Informe o valor para troco (ex: '50' ou 'não'):"
        );
      } else {
        await confirmarPedido(sender);
      }
    } else {
      await client.sendMessage(sender, 
        "❌ Opção inválida! Digite:\n1. Dinheiro 💵\n2. PIX 📱\n3. Cartão 💳\n4. ❌ Cancelar pedido"
      );
    }
    return;
  }

  if (carrinhos[sender].estado === "aguardando_troco") {
    const trocoFormatado = formatarTroco(text);
    if (trocoFormatado === 'não') {
      carrinhos[sender].troco = 'Não informado';
    } else {
      carrinhos[sender].troco = trocoFormatado;
    }
    await confirmarPedido(sender);
  }
});

async function confirmarPedido(sender) {
  const dadosPedido = {
    itens: [...carrinhos[sender].itens],
    endereco: carrinhos[sender].endereco,
    formaPagamento: carrinhos[sender].formaPagamento,
    troco: carrinhos[sender].troco || null,
    observacao: carrinhos[sender].observacao || null,
    nomeCliente: carrinhos[sender].nomeCliente,
    telefone: sender
  };
  delete carrinhos[sender];
  await client.sendMessage(sender,
    "✅ PEDIDO CONFIRMADO! 🚀\n*Sua explosão de sabores está INDO PARA CHAPA🔥️!!! 😋️🍔*\n⏱ *Tempo estimado:* 40-50 minutos\n📱 *Acompanharemos seu pedido e avisaremos quando sair para entrega!*"
  );
  await client.sendMessage(sender, 
    gerarCupomFiscal(
      dadosPedido.itens, 
      dadosPedido.endereco, 
      dadosPedido.formaPagamento,
      dadosPedido.troco,
      dadosPedido.observacao,
      { 
        nome: dadosPedido.nomeCliente, 
        telefone: dadosPedido.telefone 
      }
    )
  );
  setTimeout(async () => {
    await client.sendMessage(sender, 
      "🛵 *😋️OIEEE!!! SEU PEDIDO ESTÁ A CAMINHO!\n🔔 Deve chegar em instantes!\nSe já recebeu, ignore esta mensagem."
    );
  }, 30 * 60 * 1000);
}

// Tratamento de desconexão
let reconnectAttempts = 0;
client.on('disconnected', async (reason) => {
  reconnectAttempts++;
  logger.error(`WhatsApp desconectado (motivo: ${reason}). Tentando reconectar... ${reconnectAttempts}/3`);
  if (reconnectAttempts <= 3) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    client.initialize();
  } else {
    logger.error("Limite de reconexões atingido. Reinicie o serviço manualmente.");
  }
});

// Rotas da API
app.post('/api/chat', (req, res) => {
  try {
    const userMessage = req.body.message;
    const botResponse = responder(userMessage);
    res.json({ response: botResponse });
  } catch (error) {
    logger.error('Erro no chatbot:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

function responder(mensagem) {
  const lowerMsg = mensagem.toLowerCase();
  const respostas = {
    'oi': 'Olá! Bem-vindo ao Smash Burger! Como posso ajudar?',
    'ola': 'Olá! Pronto para fazer seu pedido?',
    'cardapio': 'Confira nosso cardápio completo: /cardapio',
    'pedido': 'Para fazer um pedido, acesse nosso WhatsApp',
    'horario': 'Funcionamos das 18h às 23h todos os dias!',
    'endereço': 'Estamos na Rua dos Hamburgers, 123 - Centro',
    'default': 'Desculpe, não entendi. Para atendimento completo, chame no WhatsApp!'
  };
  return respostas[lowerMsg] || respostas['default'];
}

// Rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/:page', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
client.initialize();
app.listen(PORT, () => {
  logger.info(`🤖 Bot WhatsApp e servidor web rodando na porta ${PORT}`);
  logger.info(`🌐 Acesse: http://localhost:${PORT}`);
  logger.info('🔍 Aguardando escaneamento do QR Code...');
});
