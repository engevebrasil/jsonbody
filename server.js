const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(express.static('public'));

// Inicialização do cliente WhatsApp
const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let carrinhos = {}; // { "5511999999999": {itens: [], estado: "...", ultimoEnvioPdf: timestamp, atendenteTimer: null} }

const cardapio = {
    lanches: [
        { id: 1, nome: "🍔 Smash Burger Clássico", preco: 20.00 },
        { id: 2, nome: "🥗 Smash! Salada", preco: 23.00 },
        { id: 3, nome: "🥓 Salada Bacon", preco: 27.00 },
        { id: 4, nome: "🍔🍔🍔 Smash!! Triple", preco: 28.00 },
        { id: 5, nome: "🍔🥓 Smash Burger Bacon", preco: 29.99 },
        { id: 6, nome: "🍔🍖️ Burger Calabacon", preco: 32.99 }
    ],
    bebidas: [
        { id: 7, nome: "🥤 Coca-Cola 2L", preco: 12.00 },
        { id: 8, nome: "🥤 Poty Guaraná 2L", preco: 10.00 },
        { id: 9, nome: "🥤 Coca-Cola Lata", preco: 6.00 },
        { id: 10, nome: "🥤 Guaraná Lata", preco: 6.00 }
    ]
};

// Caminho relativo para o PDF (dentro da pasta public)
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

// Função para remover emojis dos nomes dos itens
function removerEmojis(texto) {
    return texto.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim();
}

// Cupom fiscal minimalista com formato mais amplo
function gerarCupomFiscal(itens, endereco, formaPagamento = null, troco = null) {
    const subtotal = calcularTotal(itens);
    const taxaEntrega = subtotal * 0.1;
    const total = subtotal + taxaEntrega;
    const now = new Date();
    
    // Cabeçalho mais amplo
    let cupom = "==================================================\n";
    cupom += `           DOKA BURGER - Pedido em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}\n`;
    cupom += "==================================================\n\n";

    // Itens sem emojis e com alinhamento
    cupom += "ITENS:\n";
    itens.forEach(item => {
        const nomeSemEmoji = removerEmojis(item.nome);
        // Formatação mais ampla para os itens
        cupom += `• ${nomeSemEmoji.padEnd(35)} R$ ${formatarMoeda(item.preco)}\n`;
    });

    // Totais formatados
    cupom += "\n--------------------------------------------------\n";
    cupom += `Subtotal:         R$ ${formatarMoeda(subtotal)}\n`;
    cupom += `Taxa de Entrega:  R$ ${formatarMoeda(taxaEntrega)}\n`;
    cupom += `TOTAL:            R$ ${formatarMoeda(total)}\n\n`;

    // Endereço e pagamento
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
           "1️⃣  Adicionar itens\n" +
           "2️⃣  Finalizar compra\n" +
           "3️⃣  Cancelar pedido\n" +
           "4️⃣  Falar com atendente\n" +
           "5️⃣  📄 Ver Cardápio (PDF)\n" +
           "══════════════════════════\n" +
           "🔢 Digite o número da opção:";
}

// Eventos do WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=15&data=${encodeURIComponent(qr)}`;
    console.log('\n📢 QR Code alternativo (caso não consiga ler acima):');
    console.log(qrLink);
    console.log('⏳ Válido por 60 segundos\n');
});

client.on('ready', () => {
    console.log('🤖 Bot pronto e operacional!');
    console.log(`🕒 Última inicialização: ${new Date().toLocaleTimeString()}`);
});

client.on('message', async message => {
    const text = message.body.trim();
    const sender = message.from;
    const agora = Date.now();

    if (!carrinhos[sender]) {
        carrinhos[sender] = { itens: [], estado: "inicio", ultimoEnvioPdf: 0, atendenteTimer: null };
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
        carrinhos[sender] = { itens: [], estado: "escolhendo", ultimoEnvioPdf: carrinhos[sender]?.ultimoEnvioPdf || 0, atendenteTimer: null };
        await client.sendMessage(sender, "🔄 *Reiniciando seu pedido...*");
        await client.sendMessage(sender, mostrarCardapio());
        return;
    }

    // Mensagem de boas-vindas atualizada
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
            await client.sendMessage(sender, 
                `✅ *${itemSelecionado.nome}* adicionado ao carrinho!\n` +
                `💰 Valor: R$ ${formatarMoeda(itemSelecionado.preco)}\n\n` + 
                mostrarOpcoes()
            );
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

    // Novo estado para confirmar cancelamento
    if (carrinhos[sender].estado === "confirmando_cancelamento") {
        if (text === "1") {
            carrinhos[sender] = { itens: [], estado: "inicio", ultimoEnvioPdf: carrinhos[sender].ultimoEnvioPdf, atendenteTimer: null };
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
        
        // Calcular o total do carrinho
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
            "4. ❌ Cancelar pedido\n\n" +  // Opção 4 adicionada aqui
            "🔢 Digite o número da opção:"
        );
        carrinhos[sender].estado = "escolhendo_pagamento";
        return;
    }

    // MENU DE PAGAMENTO ATUALIZADO COM OPÇÃO DE CANCELAMENTO
    if (carrinhos[sender].estado === "escolhendo_pagamento") {
        const formas = {
            "1": "1. Dinheiro 💵",
            "2": "2. PIX 📱",
            "3": "3. Cartão 💳",
            "4": "4. ❌ Cancelar pedido"  // NOVA OPÇÃO ADICIONADA
        };

        if (formas[text]) {
            // TRATAMENTO DA NOVA OPÇÃO 4 (CANCELAMENTO)
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
                return;  // IMPORTANTE: return para evitar execução do fluxo normal
            }
            
            carrinhos[sender].formaPagamento = formas[text];

            if (text === "1") {
                carrinhos[sender].estado = "aguardando_troco";
                await client.sendMessage(sender, 
                    "💵 *Pagamento em dinheiro selecionado*\n\n" +
                    "🔄 Informe o valor para troco (ex: '50' ou 'não'):"
                );
            } else {
                await client.sendMessage(sender, 
                    gerarCupomFiscal(
                        carrinhos[sender].itens, 
                        carrinhos[sender].endereco, 
                        carrinhos[sender].formaPagamento
                    )
                );
                await confirmarPedido(sender);
                carrinhos[sender].estado = "pos_compra";
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
        await client.sendMessage(sender, 
            gerarCupomFiscal(
                carrinhos[sender].itens, 
                carrinhos[sender].endereco, 
                carrinhos[sender].formaPagamento,
                text
            )
        );
        await confirmarPedido(sender);
        carrinhos[sender].estado = "pos_compra";
    }
});

async function confirmarPedido(sender) {
    await client.sendMessage(sender,
        "✅ PEDIDO CONFIRMADO! 🚀\n\n" +
        "*Sua explosão de sabores está sendo montada! 💣🍔*\n\n" +
        "⏱ *Tempo estimado:* 40-50 minutos\n" +
        "📱 *Acompanharemos seu pedido e avisaremos quando sair para entrega!*"
    );

    setTimeout(async () => {
        await client.sendMessage(sender, 
            "🛵 *SEU PEDIDO ESTÁ A CAMINHO!*\n\n" +
            "🔔 Deve chegar em instantes!\n" +
            "Se já recebeu, ignore esta mensagem."
        );
    }, 30 * 60 * 1000);
}

client.initialize();

// Rota da API para o chat web (frontend)
app.post('/api/chat', (req, res) => {
    try {
        const userMessage = req.body.message;
        const botResponse = responder(userMessage);
        res.json({ response: botResponse });
    } catch (error) {
        console.error('Erro no chatbot:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Função de resposta para o chat web
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

// SOLUÇÃO DEFINITIVA PARA O ERRO DE ROTAS
// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para qualquer outra página - com parâmetro nomeado
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🤖 Bot WhatsApp e servidor web rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log('🔍 Aguardando escaneamento do QR Code...');
});
