const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, List, Buttons } = require('whatsapp-web.js');
const fs = require('fs');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const PDFDocument = require('pdfkit');
const axios = require('axios');

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuração do banco de dados
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ pedidos: [], clientes: {} }).write();

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Cardápio Premium
const cardapio = {
    lanches: [
        { id: 1, nome: "🍔 Smash Burger Clássico", preco: 20.00, descricao: "180g, queijo cheddar, molho especial" },
        { id: 2, nome: "🥗 Smash! Salada", preco: 23.00, descricao: "180g, mix de folhas, tomate cereja" },
        { id: 3, nome: "🥓 Salada Bacon", preco: 27.00, descricao: "180g, bacon crocante, cebola caramelizada" },
        { id: 4, nome: "🍔🍔🍔 Smash!! Triple", preco: 28.00, descricao: "3 hambúrgueres de 120g, triplo queijo" },
        { id: 5, nome: "🍔🥓 Smash Burger Bacon", preco: 29.99, descricao: "180g, bacon, cebola crispy" },
        { id: 6, nome: "🍔🍖️ Burger Calabacon", preco: 32.99, descricao: "180g, calabresa, bacon, pimenta jalapeño" }
    ],
    bebidas: [
        { id: 7, nome: "🥤 Coca-Cola 2L", preco: 12.00 },
        { id: 8, nome: "🥤 Poty Guaraná 2L", preco: 10.00 },
        { id: 9, nome: "🥤 Coca-Cola Lata", preco: 6.00 },
        { id: 10, nome: "🥤 Guaraná Lata", preco: 6.00 }
    ],
    combos: [
        { id: 11, nome: "🔥 Combo Família", preco: 89.90, descricao: "3 Smash Clássico + 2 Coca 2L" },
        { id: 12, nome: "⚡ Combo Turbo", preco: 49.90, descricao: "Smash Triple + Coca Lata" }
    ],
    sobremesas: [
        { id: 13, nome: "🍦 Casquinha", preco: 8.00 },
        { id: 14, nome: "🍰 Brownie", preco: 12.00 }
    ]
};

// Funções Premium
async function enviarMenuInterativo(sender) {
    const sections = [{
        title: "CATEGORIAS",
        rows: [
            { id: "lanches", title: "🍔 LANCHES", description: "Nossos hambúrgueres artesanais" },
            { id: "bebidas", title: "🥤 BEBIDAS", description: "Refrigerantes e sucos" },
            { id: "combos", title: "🔥 COMBOS", description: "Combos econômicos" },
            { id: "sobremesas", title: "🍰 SOBREMESAS", description: "Doces para finalizar" },
            { id: "carrinho", title: "🛒 MEU CARRINHO", description: "Ver itens selecionados" }
        ]
    }];
    
    const list = new List(
        '🌟 MENU PRINCIPAL 🌟\nSelecione uma categoria:',
        'Navegação',
        sections,
        'Cardápio Premium'
    );
    
    await client.sendMessage(sender, list);
}

async function enviarCategoria(sender, categoria) {
    if (!cardapio[categoria]) return;
    
    const rows = cardapio[categoria].map(item => ({
        id: `item_${item.id}`,
        title: `${item.nome} - R$ ${item.preco.toFixed(2)}`,
        description: item.descricao || ''
    }));
    
    const sections = [{ title: categoria.toUpperCase(), rows }];
    
    const list = new List(
        `📋 ${categoria.toUpperCase()}\nSelecione um item:`,
        'Itens',
        sections,
        'Adicionar ao carrinho'
    );
    
    await client.sendMessage(sender, list);
}

async function mostrarCarrinho(sender, carrinho) {
    if (carrinho.itens.length === 0) {
        await client.sendMessage(sender, '🛒 Seu carrinho está vazio!');
        return;
    }
    
    let message = '🛒 *SEU CARRINHO*\n\n';
    carrinho.itens.forEach((item, index) => {
        message += `${index + 1}. ${item.nome} - R$ ${item.preco.toFixed(2)}\n`;
    });
    
    const total = carrinho.itens.reduce((sum, item) => sum + item.preco, 0);
    message += `\n💵 *TOTAL: R$ ${total.toFixed(2)}*`;
    
    const buttons = new Buttons(
        message,
        [
            { id: 'finalizar', body: '✅ FINALIZAR COMPRA' },
            { id: 'adicionar', body: '➕ ADICIONAR MAIS' },
            { id: 'remover', body: '➖ REMOVER ITEM' },
            { id: 'cancelar', body: '❌ CANCELAR' }
        ],
        'Opções do Carrinho',
        'Selecione uma ação:'
    );
    
    await client.sendMessage(sender, buttons);
}

async function enviarLocalizacao(sender) {
    await client.sendMessage(sender, 'Por favor, compartilhe sua localização:');
}

async function enviarConfirmacaoPedido(sender, pedido) {
    const buttons = new Buttons(
        `✅ PEDIDO #${pedido.id} CONFIRMADO!\n\nTempo estimado: 40-50 minutos`,
        [
            { id: 'status', body: '🔄 STATUS DO PEDIDO' },
            { id: 'novo', body: '🆕 NOVO PEDIDO' },
            { id: 'ajuda', body: '❓ AJUDA' }
        ],
        'Acompanhamento',
        'O que deseja fazer?'
    );
    
    await client.sendMessage(sender, buttons);
}

async function enviarPDFCardapio(sender) {
    try {
        const response = await axios.get('https://exemplo.com/cardapio-premium.pdf', {
            responseType: 'arraybuffer'
        });
        
        const media = new MessageMedia(
            'application/pdf',
            response.data.toString('base64'),
            'cardapio_premium.pdf'
        );
        
        await client.sendMessage(sender, media, {
            caption: '📄 *Cardápio Premium Atualizado*'
        });
    } catch (e) {
        await client.sendMessage(sender, '⚠️ Cardápio temporariamente indisponível');
    }
}

// Gerar PDF profissional para o pedido
async function gerarPDFPedido(pedido) {
    const doc = new PDFDocument();
    const filename = path.join(__dirname, 'pedidos', `pedido_${pedido.id}.pdf`);
    
    doc.pipe(fs.createWriteStream(filename));
    
    // Cabeçalho
    doc.image(path.join(__dirname, 'assets', 'logo.png'), 50, 45, { width: 100 });
    doc.fontSize(20).text('DOKA BURGER PREMIUM', 200, 50, { align: 'center' });
    doc.fontSize(12).text(`Pedido: #${pedido.id}`, 200, 85, { align: 'center' });
    doc.fontSize(10).text(`Data: ${new Date().toLocaleString('pt-BR')}`, 200, 100, { align: 'center' });
    
    // Linha divisória
    doc.moveTo(50, 120).lineTo(550, 120).stroke();
    
    // Itens
    doc.fontSize(14).text('ITENS:', 50, 140);
    let y = 160;
    pedido.itens.forEach(item => {
        doc.text(`• ${item.nome} - R$ ${item.preco.toFixed(2)}`, 60, y);
        y += 20;
    });
    
    // Totais
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 20;
    doc.text(`Subtotal: R$ ${pedido.subtotal.toFixed(2)}`, 400, y);
    y += 20;
    doc.text(`Taxa de Entrega: R$ ${pedido.taxa.toFixed(2)}`, 400, y);
    y += 20;
    doc.font('Helvetica-Bold').text(`TOTAL: R$ ${pedido.total.toFixed(2)}`, 400, y);
    
    // Informações cliente
    doc.moveTo(50, y + 30).lineTo(550, y + 30).stroke();
    doc.font('Helvetica').text('CLIENTE:', 50, y + 50);
    doc.text(`Nome: ${pedido.cliente.nome}`, 60, y + 70);
    doc.text(`Telefone: ${pedido.cliente.telefone}`, 60, y + 90);
    doc.text(`Endereço: ${pedido.endereco}`, 60, y + 110);
    doc.text(`Pagamento: ${pedido.pagamento}`, 60, y + 130);
    
    doc.end();
    return filename;
}

// Eventos do WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📢 QR Code gerado! Escaneie com o WhatsApp');
});

client.on('ready', () => {
    console.log('🚀 BOT PREMIUM OPERACIONAL!');
    console.log(`⏱️ ${new Date().toLocaleString('pt-BR')}`);
});

client.on('message', async message => {
    const sender = message.from;
    const text = message.body.trim();
    
    // Inicializar carrinho
    if (!db.get(`clientes.${sender}`).value()) {
        db.set(`clientes.${sender}`, { 
            carrinho: { itens: [], estado: 'inicio' },
            historico: []
        }).write();
    }
    
    const cliente = db.get(`clientes.${sender}`).value();
    const carrinho = cliente.carrinho;
    
    // Processar localização
    if (message.location) {
        const location = message.location;
        carrinho.endereco = `Lat: ${location.latitude}, Long: ${location.longitude}`;
        db.update(`clientes.${sender}`, c => c).write();
        await client.sendMessage(sender, '📍 Localização recebida! Agora escolha a forma de pagamento:');
        await enviarOpcoesPagamento(sender);
        return;
    }
    
    // Processar mensagens
    switch (carrinho.estado) {
        case 'inicio':
            await enviarBoasVindas(sender);
            carrinho.estado = 'menu';
            db.update(`clientes.${sender}`, c => c).write();
            break;
            
        case 'menu':
            if (message.hasButton) {
                const buttonId = message.selectedButtonId;
                if (buttonId === 'cardapio') await enviarPDFCardapio(sender);
                else if (buttonId === 'novopedido') await enviarMenuInterativo(sender);
            }
            break;
            
        // ... (outros estados)
    }
});

// Inicialização
client.initialize();

app.listen(PORT, () => {
    console.log(`💎 BOT PREMIUM RODANDO NA PORTA ${PORT}`);
    console.log('🌐 Dashboard: http://localhost:3000/admin');
});
