const express = require('express');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static('public'));

// Inicialização do cliente WhatsApp com persistência de sessão
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: 'sessions'
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    }
});

// Estrutura de dados para pedidos
const pedidos = new Map();

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

// Caminho para o PDF do cardápio
const PDF_PATH = path.join(__dirname, 'public', 'cardapio.pdf');
const PDF_URL = `http://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:' + PORT}/cardapio.pdf`;

// Funções auxiliares
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
}

function formatarTroco(troco) {
    if (/não|nao/i.test(troco)) return 'não';
    
    const valor = parseFloat(troco.replace(',', '.'));
    return isNaN(valor) ? 'valor inválido' : formatarMoeda(valor);
}

function calcularTotal(itens) {
    const subtotal = itens.reduce((sum, item) => sum + item.preco, 0);
    const taxaEntrega = subtotal * 0.1;
    const total = subtotal + taxaEntrega;
    return { subtotal, taxaEntrega, total };
}

function gerarCupomFiscal(itens, endereco, formaPagamento, troco = null) {
    const { subtotal, taxaEntrega, total } = calcularTotal(itens);
    const now = new Date();
    
    let cupom = `🍔 *SMASH BURGER* - ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}\n\n`;
    cupom += "📋 *ITENS:*\n";
    
    itens.forEach(item => {
        cupom += `▫️ ${item.nome} - ${formatarMoeda(item.preco)}\n`;
    });

    cupom += `\n💲 Subtotal: ${formatarMoeda(subtotal)}`;
    cupom += `\n🚚 Taxa de Entrega (10%): ${formatarMoeda(taxaEntrega)}`;
    cupom += `\n💵 *TOTAL: ${formatarMoeda(total)}*\n`;
    cupom += `\n🏠 *ENDEREÇO:*\n${endereco}\n`;
    cupom += `\n💳 *PAGAMENTO:* ${formaPagamento}\n`;

    if (formaPagamento.includes("Dinheiro") && troco) {
        cupom += `\n🪙 Troco para: ${formatarTroco(troco)}`;
    }

    return cupom;
}

function mostrarCardapio() {
    let msg = "🌟 *CARDÁPIO SMASH BURGER* 🌟\n\n";
    
    // Lanches
    msg += "🍔 *LANCHES*\n";
    cardapio.lanches.forEach(item => {
        msg += `🔹 ${item.id}. ${item.nome} - ${formatarMoeda(item.preco)}\n`;
    });

    // Bebidas
    msg += "\n🥤 *BEBIDAS*\n";
    cardapio.bebidas.forEach(item => {
        msg += `🔹 ${item.id}. ${item.nome} - ${formatarMoeda(item.preco)}\n`;
    });

    msg += "\n🔢 Digite o *NÚMERO* do item:";
    return msg;
}

function mostrarOpcoes() {
    return "✨ *OPÇÕES* ✨\n\n" +
        "1. ➕ Adicionar itens\n" +
        "2. ✅ Finalizar pedido\n" +
        "3. ❌ Cancelar\n" +
        "4. 👨‍🍳 Falar com atendente\n" +
        "5. 📄 Cardápio PDF\n\n" +
        "🔢 Digite o número:";
}

// Eventos do WhatsApp
client.on('qr', qr => {
    // QR code no terminal
    qrcode.generate(qr, { small: true });
    
    // Link alternativo
    const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('\n🔗 LINK PARA ESCANEAMENTO:');
    console.log(qrLink);
    console.log('⏳ Válido por 60 segundos');
});

client.on('authenticated', () => {
    console.log('🔑 Autenticação realizada!');
});

client.on('ready', () => {
    console.log('🤖 Bot pronto!');
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString()}`);
});

client.on('disconnected', (reason) => {
    console.log(`❌ Conexão perdida: ${reason}`);
    console.log('Reiniciando em 5 segundos...');
    setTimeout(() => client.initialize(), 5000);
});

// Gerenciamento de mensagens
client.on('message', async message => {
    try {
        const texto = message.body.trim();
        const remetente = message.from;
        const agora = Date.now();

        // Inicializar pedido se necessário
        if (!pedidos.has(remetente)) {
            pedidos.set(remetente, {
                itens: [],
                estado: "inicio",
                ultimoEnvioPdf: 0,
                atendenteTimer: null
            });
            
            // SAUDAÇÃO PERSONALIZADA PARA NOVOS CLIENTES
            await client.sendMessage(
                remetente,
                "🍔 Olá, Smash Lover!\n" +
                "Seja bem-vindo(a) ao paraíso dos hambúrgueres! 🌟\n" +
                "Aqui, cada mordida é uma explosão de sabor.\n" +
                "👉 Vamos matar sua fome? Peça já! 🔥"
            );
            
            // BOTÃO PARA ACESSAR O CARDÁPIO EM PDF
            await client.sendMessage(remetente, {
                text: "📄 Clique no botão abaixo para ver nosso cardápio completo",
                buttons: [
                    { body: "📄 Ver Cardápio" }
                ],
                title: "Cardápio Smash Burger",
                footer: "Tudo feito com ingredientes frescos e selecionados"
            });
        }
        
        const pedido = pedidos.get(remetente);

        // Verificar atendente humano
        if (pedido.atendenteTimer && (agora - pedido.atendenteTimer < 600000)) return;
        
        if (pedido.atendenteTimer) {
            pedido.atendenteTimer = null;
            pedido.estado = "opcoes";
            await client.sendMessage(remetente, "⏳ *Atendimento humano encerrado*\nComo posso ajudar?");
            await client.sendMessage(remetente, mostrarOpcoes());
            return;
        }

        // Comandos especiais
        if (/cliente|reiniciar/i.test(texto)) {
            pedidos.set(remetente, {
                itens: [],
                estado: "escolhendo",
                ultimoEnvioPdf: pedido.ultimoEnvioPdf,
                atendenteTimer: null
            });
            await client.sendMessage(remetente, "🔄 *Pedido reiniciado!*");
            return client.sendMessage(remetente, mostrarCardapio());
        }

        // TRATAMENTO DO BOTÃO DE CARDÁPIO
        if (texto === '📄 Ver Cardápio') {
            if (fs.existsSync(PDF_PATH)) {
                const media = MessageMedia.fromFilePath(PDF_PATH);
                await client.sendMessage(remetente, media, { 
                    caption: '📄 *CARDÁPIO COMPLETO SMASH BURGER!*\n' +
                             '👉 Acesse também: ' + PDF_URL 
                });
                pedido.ultimoEnvioPdf = agora;
            } else {
                await client.sendMessage(remetente, "⚠️ *Cardápio temporariamente indisponível*");
            }
            return client.sendMessage(remetente, "🔢 Digite o *NÚMERO* do item que deseja pedir:");
        }

        // Fluxo principal
        switch (pedido.estado) {
            case "inicio":
            case "pos_compra":
                pedido.estado = "opcoes";
                await client.sendMessage(remetente, mostrarOpcoes());
                break;
                
            case "opcoes":
                await processarOpcao(remetente, pedido, texto);
                break;
                
            case "escolhendo":
                await adicionarItem(remetente, pedido, texto);
                break;
                
            case "aguardando_endereco":
                await processarEndereco(remetente, pedido, texto);
                break;
                
            case "escolhendo_pagamento":
                await processarPagamento(remetente, pedido, texto);
                break;
                
            case "aguardando_troco":
                await processarTroco(remetente, pedido, texto);
                break;
        }
    } catch (error) {
        console.error('Erro no processamento:', error);
    }
});

// Funções de processamento
async function processarOpcao(remetente, pedido, texto) {
    if (/cardapio|5/.test(texto)) {
        if (fs.existsSync(PDF_PATH)) {
            const media = MessageMedia.fromFilePath(PDF_PATH);
            await client.sendMessage(remetente, media, { 
                caption: '📄 *CARDÁPIO COMPLETO SMASH BURGER!*\n' +
                         '👉 Acesse também: ' + PDF_URL 
            });
            pedido.ultimoEnvioPdf = Date.now();
        } else {
            await client.sendMessage(remetente, "⚠️ *Cardápio indisponível*");
        }
        return client.sendMessage(remetente, "🔢 Digite o *NÚMERO* do item que deseja pedir:");
    }

    switch (texto) {
        case "1":
            pedido.estado = "escolhendo";
            await client.sendMessage(remetente, "📝 *Adicione itens:*");
            await client.sendMessage(remetente, mostrarCardapio());
            break;
            
        case "2":
            if (pedido.itens.length === 0) {
                return client.sendMessage(remetente, "🛒 *Carrinho vazio!* Adicione itens primeiro.");
            }
            pedido.estado = "aguardando_endereco";
            await client.sendMessage(
                remetente,
                "🏠 *ENDEREÇO DE ENTREGA*\n\n" +
                "Por favor, envie:\n" +
                "📍 Rua, Número\n" +
                "🏘️ Bairro\n" +
                "📌 Ponto de referência\n\n" +
                "Exemplo:\n" +
                "👉 Rua das Flores, 123\n" +
                "👉 Centro\n" +
                "👉 Próximo ao mercado"
            );
            break;
            
        case "3":
            pedidos.set(remetente, {
                itens: [],
                estado: "inicio",
                ultimoEnvioPdf: pedido.ultimoEnvioPdf,
                atendenteTimer: null
            });
            await client.sendMessage(remetente, "🗑️ *Pedido cancelado!*");
            // Reenviar saudação inicial
            await client.sendMessage(
                remetente,
                "🍔 Olá, Smash Lover!\n" +
                "Seja bem-vindo(a) ao paraíso dos hambúrgueres! 🌟"
            );
            break;
            
        case "4":
            pedido.atendenteTimer = Date.now();
            await client.sendMessage(
                remetente,
                "👨‍🍳 *ATENDENTE ACIONADO!*\n\n" +
                "Você será atendido por um de nossos especialistas em hambúrgueres!\n\n" +
                "⏳ Tempo de atendimento: 10 minutos\n" +
                "⏰ Após esse período, retornaremos ao modo automático"
            );
            break;
            
        default:
            await client.sendMessage(remetente, "⚠️ *Opção inválida!*");
            await client.sendMessage(remetente, mostrarOpcoes());
    }
}

async function adicionarItem(remetente, pedido, texto) {
    const id = parseInt(texto);
    const item = [...cardapio.lanches, ...cardapio.bebidas].find(i => i.id === id);
    
    if (item) {
        pedido.itens.push(item);
        pedido.estado = "opcoes";
        await client.sendMessage(
            remetente,
            `✅ *${item.nome}* adicionado!\n` +
            `💲 Valor: ${formatarMoeda(item.preco)}`
        );
        await client.sendMessage(remetente, mostrarOpcoes());
    } else {
        await client.sendMessage(remetente, "❌ *Item inválido!* Digite apenas números do cardápio.");
        await client.sendMessage(remetente, mostrarCardapio());
    }
}

async function processarEndereco(remetente, pedido, texto) {
    if (texto.length < 15) {
        return client.sendMessage(remetente, "📢 *Endereço incompleto!* Informe rua, número e bairro.");
    }
    
    pedido.endereco = texto;
    pedido.estado = "escolhendo_pagamento";
    
    await client.sendMessage(
        remetente,
        "💳 *FORMA DE PAGAMENTO* 💳\n\n" +
        "1. 💵 Dinheiro\n" +
        "2. 📱 PIX\n" +
        "3. 💳 Cartão\n\n" +
        "🔢 Digite o número da opção:"
    );
}

async function processarPagamento(remetente, pedido, texto) {
    const formas = {
        "1": "💵 Dinheiro",
        "2": "📱 PIX",
        "3": "💳 Cartão"
    };
    
    const forma = formas[texto];
    
    if (forma) {
        pedido.formaPagamento = forma;
        
        if (texto === "1") {
            pedido.estado = "aguardando_troco";
            await client.sendMessage(remetente, 
                "💵 *Pagamento em dinheiro selecionado*\n\n" +
                "🔄 Informe o valor para troco (ex: '50' ou 'não'):"
            );
        } else {
            await finalizarPedido(remetente, pedido);
        }
    } else {
        await client.sendMessage(remetente, "❌ Opção inválida. Digite 1, 2 ou 3.");
    }
}

async function processarTroco(remetente, pedido, texto) {
    pedido.troco = texto;
    await finalizarPedido(remetente, pedido);
}

async function finalizarPedido(remetente, pedido) {
    const cupom = gerarCupomFiscal(
        pedido.itens,
        pedido.endereco,
        pedido.formaPagamento,
        pedido.troco
    );
    
    await client.sendMessage(remetente, cupom);
    
    // MENSAGEM DE CONFIRMAÇÃO ATUALIZADA
    await client.sendMessage(
        remetente,
        "✅ *PEDIDO CONFIRMADO!* 🎊\n" +
        "Seu Smash já está sendo preparado com *AMOR & CROCÂNCIA!* ❤️🍟\n\n" +
        "⏳ *Tempo estimado:* 30 a 50 min\n" +
        "📱 Acompanharemos seu pedido e avisaremos quando sair para entrega!"
    );
    
    pedido.estado = "pos_compra";
    
    // Notificação de entrega
    setTimeout(async () => {
        await client.sendMessage(
            remetente,
            "🛵 *SEU PEDIDO ESTÁ A CAMINHO!*\n\n" +
            "🔔 Deve chegar em instantes!\n" +
            "Se já recebeu, ignore esta mensagem."
        );
    }, 30 * 60 * 1000);
}

// Inicialização
client.initialize();

// API para chat web
app.post('/api/chat', (req, res) => {
    try {
        const respostas = {
            'oi': 'Olá! Bem-vindo ao Smash Burger!',
            'cardapio': `Confira nosso cardápio: ${PDF_URL}`,
            'horario': 'Funcionamos das 18h às 23h todos os dias!',
            'endereco': 'Estamos na Rua dos Hamburgers, 123 - Centro',
            'default': 'Para fazer pedidos, chame no WhatsApp!'
        };
        
        const resposta = respostas[req.body.message.toLowerCase()] || respostas['default'];
        res.json({ response: resposta });
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
    console.log('🔍 Aguardando escaneamento do QR Code...');
    console.log(`📄 Cardápio disponível em: ${PDF_URL}`);
});
