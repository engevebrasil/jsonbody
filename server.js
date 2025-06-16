const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// Configuração simplificada de logs
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 10, height: 10 }
  },
  session: fs.existsSync('./session.json') ? require('./session.json') : null,
  restartOnAuthFail: true,
  takeoverOnConflict: true
});

// Estrutura para armazenar dados dos clientes
let carrinhos = {};

// Limpeza a cada 20 segundos
setInterval(() => {
  const now = Date.now();
  for (const [sender, data] of Object.entries(carrinhos)) {
    if (now - (data.ultimoEnvioPdf || now) > 20000) {
      delete carrinhos[sender];
      logger.info(`🔄 Carrinho de ${sender} removido por inatividade`);
    }
  }
}, 20000);

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
        { id: 10, nome:" Guaraná Lata", preco: 6.00 }
    ]
};

const PDF_PATH = path.join(__dirname, 'public', 'cardapio.pdf');

// Funções auxiliares
function formatarTroco(troco) {
    if (troco.toLowerCase() === 'não' || troco.toLowerCase() === 'nao') {
        return 'não';
    }
    const numeros = troco.replace(/[^\d,.]/g, '').replace('.', ',');
    const partes = numeros.split(',');
    let inteiro = partes[0] || '0';
    let centavos = partes[1] ? partes[1].padEnd(2, '0').slice(0, 2) : '00';
    return `R$ ${inteiro},${centavos}`;
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
    cupom += `           DOKA BURGER - Pedido em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}\n`;
    cupom += "==================================================\n\n";

    if (cliente) {
        cupom += "👤 *DADOS DO CLIENTE*\n";
        cupom += `Nome: ${cliente.nome}\n`;
        cupom += `Telefone: ${cliente.telefone}\n\n`;
    }

    cupom += "ITENS:\n";
    itens.forEach(item => {
        const nomeSemEmoji = removerEmojis(item.nome);
        cupom += `• ${nomeSemEmoji.padEnd(35)} R$ ${formatarMoeda(item.preco)}\n`;
    });

    if (observacao) {
        cupom += "\n--------------------------------------------------\n";
        cupom += "OBSERVAÇÃO:\n";
        cupom += `${observacao}\n`;
    }

    cupom += "\n--------------------------------------------------\n";
    cupom += `Subtotal:         R$ ${formatarMoeda(subtotal)}\n`;
    cupom += `Taxa de Entrega:  R$ ${formatarMoeda(taxaEntrega)}\n`;
    cupom += `TOTAL:            R$ ${formatarMoeda(total)}\n\n`;

    cupom += "ENDEREÇO:\n";
    cupom += `${endereco}\n\n`;
    
    cupom += "FORMA DE PAGAMENTO:\n";
    cupom += `${formaPagamento}\n`;

    if (formaPagamento === "1. Dinheiro 💵" && troco) {
        cupom += `\nTroco para: ${formatarTroco(troco)}\n`;
    }

    cupom += "\n==================================================\n";
    cupom += "           OBRIGADO PELA PREFERÊNCIA!";

    return cupom;
}

function mostrarCardapio() {
    let msg = "🌟 *CARDÁPIO DOKA BURGER* 🌟\n\n";
    msg += "══════════════════════════\n";
    msg += "🍔 *LANCHES*\n";
    msg += "══════════════════════════\n";
    cardapio.lanches.forEach(item => {
        msg += `🔹 *${item.id}* ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
    });

    msg += "\n══════════════════════════\n";
    msg += "🥤 *BEBIDAS*\n";
    msg += "══════════════════════════\n";
    cardapio.bebidas.forEach(item => {
        msg += `🔹 *${item.id}* ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
    });

    msg += "\n══════════════════════════\n";
    msg += "🔢 Digite o *NÚMERO* do item desejado:";
    return msg;
}

function mostrarOpcoes() {
    return "✨ *O QUE DESEJA FAZER?* ✨\n\n" +
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
    let mensagem = "✏️ *EDIÇÃO DE PEDIDO* ✏️\n\n";
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

    // Captura nome do cliente na primeira mensagem
    if (!carrinhos[sender]) {
        carrinhos[sender] = { 
            itens: [], 
            estado: "inicio", 
            ultimoEnvioPdf: 0, 
            atendenteTimer: null,
            nomeCliente: message._data.notifyName || "Cliente"
        };
        logger.info(`👤 Novo cliente registrado: ${carrinhos[sender].nomeCliente} (${sender})`);
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
            ultimoEnvioPdf: carrinhos[sender]?.ultimoEnvioPdf || 0, 
            atendenteTimer: null,
            nomeCliente: carrinhos[sender].nomeCliente
        };
        await client.sendMessage(sender, "🔄 *Reiniciando seu pedido...*");
        await client.sendMessage(sender, mostrarCardapio());
        return;
    }

    if (carrinhos[sender].estado === "inicio" || carrinhos[sender].estado === "pos_compra") {
        carrinhos[sender].estado = "opcoes";
        await client.sendMessage(sender, "🍔🔥 *Bem-vindo ao nosso universo de sabor!* Cada mordida é uma explosão de felicidade. Preparado para essa experiência incrível? 😃 aberto das 18:00 as 23:00");
        await client.sendMessage(sender, mostrarOpcoes());
        return;
    }

    if (text === '5' || text.toLowerCase().includes('cardapio')) {
        if (fs.existsSync(PDF_PATH)) {
            const media = MessageMedia.fromFilePath(PDF_PATH);
            await client.sendMessage(sender, media, { caption: '📄 *Cardápio Completo Smash Burger!*' });
            carrinhos[sender].ultimoEnvioPdf = agora;
        } else {
            await client.sendMessage(sender, "⚠️ *Cardápio temporariamente indisponível.*");
        }
        
        if (carrinhos[sender].estado === "escolhendo") {
            await client.sendMessage(sender, mostrarCardapio());
        } else {
            await client.sendMessage(sender, mostrarOpcoes());
        }
        return;
    }

    if (carrinhos[sender].estado === "escolhendo") {
        const numeroItem = parseInt(text);
        const todosItens = [...cardapio.lanches, ...cardapio.bebidas];
        const itemSelecionado = todosItens.find(item => item.id === numeroItem);

        if (itemSelecionado) {
            carrinhos[sender].itens.push(itemSelecionado);
            carrinhos[sender].estado = "opcoes";
            
            let mensagemCarrinho = `✅ *${itemSelecionado.nome}* adicionado ao carrinho!\n💰 Valor: R$ ${formatarMoeda(itemSelecionado.preco)}\n\n`;
            mensagemCarrinho += "🛒 *SEU CARRINHO ATUAL:*\n";
            
            carrinhos[sender].itens.forEach((item, index) => {
                mensagemCarrinho += `➡️ ${index + 1}. ${item.nome} - R$ ${formatarMoeda(item.preco)}\n`;
            });
            
            await client.sendMessage(sender, mensagemCarrinho);
            await client.sendMessage(sender, mostrarOpcoes());
        } else {
            await client.sendMessage(sender, 
                "❌ *Item não encontrado!*\n\n" +
                "🔢 Por favor, digite apenas o número do item conforme o cardápio:"
            );
            await client.sendMessage(sender, mostrarCardapio());
        }
        return;
    }

    if (carrinhos[sender].estado === "opcoes") {
        switch (text) {
            case "1":
                carrinhos[sender].estado = "escolhendo";
                await client.sendMessage(sender, "📝 *Adicionando itens...*");
                await client.sendMessage(sender, mostrarCardapio());
                break;

            case "2":
                if (carrinhos[sender].itens.length === 0) {
                    await client.sendMessage(sender, "🛒 *Seu carrinho está vazio!*\nAdicione itens antes de finalizar.");
                    return;
                }
                carrinhos[sender].estado = "perguntando_observacao";
                await client.sendMessage(sender,
                    "📝 *DESEJA ADICIONAR ALGUMA OBSERVAÇÃO?*\n\n" +
                    "Ex: sem cebola, ponto da carne, etc.\n\n" +
                    "1. Sim\n" +
                    "2. Não\n\n" +
                    "🔢 Digite o número da opção:"
                );
                break;

            case "3":
                carrinhos[sender].estado = "confirmando_cancelamento";
                await client.sendMessage(sender, 
                    "⚠️ *CANCELAMENTO DE PEDIDO* ⚠️\n\n" +
                    "🔥 Seu pedido está indo para chapa!\n" +
                    "Mas antes, confirme se realmente quer fazer isso...\n\n" +
                    "🍔 Você perderá:\n" +
                    "   • Hambúrgueres suculentos\n" +
                    "   • Combos incríveis\n" +
                    "   • Momentos de felicidade\n\n" +
                    "________________________________\n" +
                    "🛑 *CONFIRME O CANCELAMENTO:*\n" +
                    "1. ✅ Sim, cancelar tudo\n" +
                    "2. ❌ Não, quero continuar\n" +
                    "________________________________\n" +
                    "🔢 Digite o número da opção:"
                );
                break;
                
            case "4":
                carrinhos[sender].atendenteTimer = Date.now();
                await client.sendMessage(sender,
                    "👨‍🍳 *ATENDENTE HUMANO ACIONADO!*\n\n" +
                    "Você será atendido por um de nossos especialistas em hambúrgueres!\n\n" +
                    "⏳ Tempo de atendimento: 10 minutos\n" +
                    "⏰ Após esse período, retornaremos ao modo automático"
                );
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
                    "⚠️ *OPÇÃO INVÁLIDA!*\n\n" +
                    "Por favor, escolha uma das opções abaixo:"
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
                "✍️ *POR FAVOR, DIGITE SUA OBSERVAÇÃO:*\n\n" +
                "Ex: Sem cebola, carne bem passada, etc."
            );
        } else if (text === "2") {
            carrinhos[sender].estado = "aguardando_endereco";
            await client.sendMessage(sender,
                "🏠 *INFORME SEU ENDEREÇO*\n\n" +
                "Por favor, envie:\n" +
                "🧩  Rua, Número\n" +
                "🏘️  Bairro\n" +
                "📌  Ponto de referência\n\n" +
                "🏆 Exemplo:\n" +
                " Rua das Flores, 123    Bairro Centro     Próximo ao mercado"
            );
        } else {
            await client.sendMessage(sender, 
                "❌ *OPÇÃO INVÁLIDA!*\n\n" +
                "Por favor, digite:\n" +
                "1. Sim\n" +
                "2. Não"
            );
        }
        return;
    }

    if (carrinhos[sender].estado === "aguardando_observacao") {
        carrinhos[sender].observacao = text;
        carrinhos[sender].estado = "aguardando_endereco";
        await client.sendMessage(sender, "✅ Observação salva com sucesso!");
        await client.sendMessage(sender,
            "🏠 *INFORME SEU ENDEREÇO*\n\n" +
            "Por favor, envie:\n" +
            "🧩  Rua, Número\n" +
            "🏘️  Bairro\n" +
            "📌  Ponto de referência\n\n" +
            "🏆 Exemplo:\n" +
            " Rua das Flores, 123    Bairro Centro     Próximo ao mercado"
        );
        return;
    }

    if (carrinhos[sender].estado === "confirmando_cancelamento") {
        if (text === "1") {
            carrinhos[sender] = { 
                itens: [], 
                estado: "inicio", 
                ultimoEnvioPdf: carrinhos[sender].ultimoEnvioPdf, 
                atendenteTimer: null,
                nomeCliente: carrinhos[sender].nomeCliente
            };
            await client.sendMessage(sender, 
                "🗑️ *PEDIDO CANCELADO!*\n\n" +
                "😢 Estamos tristes em vê-lo partir!\n\n" +
                "⚡ Mas sempre que quiser voltar, estamos aqui!\n" +
                "🔄 Digite *'cliente'* para recomeçar!"
            );
        } else if (text === "2") {
            carrinhos[sender].estado = "opcoes";
            await client.sendMessage(sender, 
                "🎉 *PEDIDO MANTIDO!*\n\n" +
                "🌟 Excelente escolha! Seu hambúrguer está salvo!\n" +
                "👏 Continue com sua experiência gastronômica!\n\n" +
                "💬 O que deseja fazer agora?"
            );
            await client.sendMessage(sender, mostrarOpcoes());
        } else {
            await client.sendMessage(sender, 
                "❌ *OPÇÃO INVÁLIDA!*\n\n" +
                "Por favor, escolha:\n" +
                "1. ✅ Sim, cancelar tudo\n" +
                "2. ❌ Não, quero continuar"
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
            "💳 *FORMA DE PAGAMENTO* 💳\n\n" +
            `💰 *TOTAL DO PEDIDO: R$ ${formatarMoeda(valorTotal)}*\n` +
            `(Itens: R$ ${formatarMoeda(subtotal)} + Entrega: R$ ${formatarMoeda(taxaEntrega)})\n\n` +
            "1. Dinheiro 💵\n" +
            "2. PIX 📱\n" +
            "3. Cartão 💳\n" +
            "4. ❌ Cancelar pedido\n\n" +
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
                    "⚠️ *CANCELAMENTO DE PEDIDO* ⚠️\n\n" +
                    "🔥 Seu pedido está prestes a ser cancelado!\n" +
                    "Confirme se realmente deseja cancelar:\n\n" +
                    "________________________________\n" +
                    "🛑 *CONFIRME O CANCELAMENTO:*\n" +
                    "1. ✅ Sim, cancelar tudo\n" +
                    "2. ❌ Não, quero continuar\n" +
                    "________________________________\n" +
                    "🔢 Digite o número da opção:"
                );
                return;
            }
            
            carrinhos[sender].formaPagamento = formas[text];

            if (text === "1") {
                carrinhos[sender].estado = "aguardando_troco";
                await client.sendMessage(sender, 
                    "💵 *Pagamento em dinheiro selecionado*\n\n" +
                    "🔄 Informe o valor para troco (ex: '50' ou 'não'):"
                );
            } else {
                await confirmarPedido(sender);
            }
        } else {
            await client.sendMessage(sender, 
                "❌ Opção inválida! Digite:\n" +
                "1. Dinheiro 💵\n" +
                "2. PIX 📱\n" +
                "3. Cartão 💳\n" +
                "4. ❌ Cancelar pedido"
            );
        }
        return;
    }

    if (carrinhos[sender].estado === "aguardando_troco") {
        carrinhos[sender].troco = text;
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
        "✅ PEDIDO CONFIRMADO! 🚀\n\n" +
        "*Sua explosão de sabores está INDO PARA CHAPA🔥️!!! 😋️🍔*\n\n" +
        "⏱ *Tempo estimado:* 40-50 minutos\n" +
        "📱 *Acompanharemos seu pedido e avisaremos quando sair para entrega!*"
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
            "🛵 *😋️OIEEE!!! SEU PEDIDO ESTÁ A CAMINHO!*\n\n" +
            "🔔 Deve chegar em instantes!\n" +
            "Se já recebeu, ignore esta mensagem."
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

client.initialize();

// Rota da API para o chat web
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
app.listen(PORT, () => {
    logger.info(`🤖 Bot WhatsApp e servidor web rodando na porta ${PORT}`);
    logger.info(`🌐 Acesse: http://localhost:${PORT}`);
    logger.info('🔍 Aguardando escaneamento do QR Code...');
});
