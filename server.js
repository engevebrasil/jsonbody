<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BurgerBot Premium</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: linear-gradient(135deg, #ff7b25, #ff5e62);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 900px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 95vh;
        }
        
        header {
            background: #ff5722;
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        }
        
        .logo {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .tag {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ffeb3b;
            color: #333;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .chat-container {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f9f9f9;
            display: flex;
            flex-direction: column;
        }
        
        .message {
            max-width: 80%;
            padding: 12px 16px;
            margin-bottom: 15px;
            border-radius: 18px;
            position: relative;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .bot-message {
            background: #e0e0e0;
            align-self: flex-start;
            border-bottom-left-radius: 5px;
        }
        
        .user-message {
            background: #4caf50;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 5px;
        }
        
        .options {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
        }
        
        .option-btn {
            background: #ff9800;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 8px 15px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .option-btn:hover {
            background: #f57c00;
            transform: translateY(-2px);
        }
        
        .input-container {
            padding: 15px;
            background: white;
            display: flex;
            border-top: 1px solid #eee;
        }
        
        #user-input {
            flex: 1;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 25px;
            outline: none;
            font-size: 1rem;
        }
        
        #send-btn {
            background: #ff5722;
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            margin-left: 10px;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }
        
        #send-btn:hover {
            background: #e64a19;
            transform: scale(1.05);
        }
        
        .menu-card {
            background: white;
            border-radius: 15px;
            padding: 15px;
            margin: 10px 0;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .menu-header {
            color: #ff5722;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px dashed #ff9800;
        }
        
        .menu-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .menu-item:last-child {
            border-bottom: none;
        }
        
        .cart {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 15px;
            margin-top: 15px;
        }
        
        .cart-header {
            color: #4caf50;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
        }
        
        .cart-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        
        .cart-total {
            font-weight: bold;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #4caf50;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .action-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            cursor: pointer;
        }
        
        .add-btn {
            background: #4caf50;
        }
        
        .checkout-btn {
            background: #ff5722;
        }
        
        .cancel-btn {
            background: #f44336;
        }
        
        .status {
            display: flex;
            align-items: center;
            margin-top: 10px;
            padding: 10px;
            background: #e3f2fd;
            border-radius: 10px;
            color: #1976d2;
        }
        
        .status i {
            margin-right: 10px;
            font-size: 1.2rem;
        }
        
        @media (max-width: 600px) {
            .container {
                height: 100vh;
                border-radius: 0;
            }
            
            .message {
                max-width: 90%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="tag">PREMIUM</div>
            <div class="logo">🍔 BURGERBOT</div>
            <h1>Atendimento Premium</h1>
            <p>Faça seu pedido de forma rápida e fácil!</p>
        </header>
        
        <div class="chat-container" id="chat-container">
            <div class="message bot-message">
                Olá! 👋 Bem-vindo à Hamburgueria Premium!
                <p>Como posso ajudar você hoje?</p>
                
                <div class="options">
                    <button class="option-btn" onclick="selectOption('fazer-pedido')">🍔 Fazer Pedido</button>
                    <button class="option-btn" onclick="selectOption('ver-cardapio')">📄 Ver Cardápio</button>
                    <button class="option-btn" onclick="selectOption('status-pedido')">🔄 Status do Pedido</button>
                    <button class="option-btn" onclick="selectOption('falar-atendente')">👨‍🍳 Falar com Atendente</button>
                </div>
            </div>
        </div>
        
        <div class="input-container">
            <input type="text" id="user-input" placeholder="Digite sua mensagem..." autocomplete="off">
            <button id="send-btn"><i class="fas fa-paper-plane"></i></button>
        </div>
    </div>

    <script>
        const chatContainer = document.getElementById('chat-container');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        
        // Simulação de cardápio
        const cardapio = {
            lanches: [
                { id: 1, nome: "🍔 Smash Burger Clássico", preco: 20.00, descricao: "180g, queijo cheddar, molho especial" },
                { id: 2, nome: "🥗 Smash! Salada", preco: 23.00, descricao: "180g, mix de folhas, tomate cereja" },
                { id: 3, nome: "🥓 Salada Bacon", preco: 27.00, descricao: "180g, bacon crocante, cebola caramelizada" },
                { id: 4, nome: "🍔🍔🍔 Smash!! Triple", preco: 28.00, descricao: "3 hambúrgueres de 120g, triplo queijo" },
                { id: 5, nome: "🍔🥓 Smash Burger Bacon", preco: 29.99, descricao: "180g, bacon, cebola crispy" }
            ],
            bebidas: [
                { id: 6, nome: "🥤 Coca-Cola 2L", preco: 12.00 },
                { id: 7, nome: "🥤 Poty Guaraná 2L", preco: 10.00 },
                { id: 8, nome: "🥤 Coca-Cola Lata", preco: 6.00 },
                { id: 9, nome: "🥤 Guaraná Lata", preco: 6.00 }
            ],
            combos: [
                { id: 10, nome: "🔥 Combo Família", preco: 89.90, descricao: "3 Smash Clássico + 2 Coca 2L" },
                { id: 11, nome: "⚡ Combo Turbo", preco: 49.90, descricao: "Smash Triple + Coca Lata" }
            ]
        };
        
        // Estado do pedido
        let pedidoAtual = {
            itens: [],
            estado: "inicio"
        };
        
        // Função para adicionar mensagens ao chat
        function addMessage(message, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
            messageDiv.innerHTML = message;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // Função para mostrar o cardápio
        function mostrarCardapio() {
            let html = `
                <div class="menu-card">
                    <h3 class="menu-header">🍔 LANCHES</h3>
            `;
            
            cardapio.lanches.forEach(item => {
                html += `
                    <div class="menu-item">
                        <div>
                            <strong>${item.nome}</strong>
                            <div><small>${item.descricao}</small></div>
                        </div>
                        <div>
                            R$ ${item.preco.toFixed(2)}
                            <button class="option-btn" onclick="adicionarAoCarrinho(${item.id})" style="margin-left: 8px; padding: 4px 8px;">+</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
                <div class="menu-card">
                    <h3 class="menu-header">🥤 BEBIDAS</h3>
            `;
            
            cardapio.bebidas.forEach(item => {
                html += `
                    <div class="menu-item">
                        <div>
                            <strong>${item.nome}</strong>
                        </div>
                        <div>
                            R$ ${item.preco.toFixed(2)}
                            <button class="option-btn" onclick="adicionarAoCarrinho(${item.id})" style="margin-left: 8px; padding: 4px 8px;">+</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
                <div class="menu-card">
                    <h3 class="menu-header">🔥 COMBOS</h3>
            `;
            
            cardapio.combos.forEach(item => {
                html += `
                    <div class="menu-item">
                        <div>
                            <strong>${item.nome}</strong>
                            <div><small>${item.descricao}</small></div>
                        </div>
                        <div>
                            R$ ${item.preco.toFixed(2)}
                            <button class="option-btn" onclick="adicionarAoCarrinho(${item.id})" style="margin-left: 8px; padding: 4px 8px;">+</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
                <div class="options">
                    <button class="option-btn" onclick="mostrarCarrinho()">🛒 Ver Carrinho</button>
                    <button class="option-btn" onclick="iniciarAtendimento()">↩️ Voltar</button>
                </div>
            `;
            
            addMessage(html);
        }
        
        // Função para adicionar item ao carrinho
        function adicionarAoCarrinho(itemId) {
            // Encontrar item em todas as categorias
            let itemSelecionado = null;
            
            for (const categoria in cardapio) {
                const item = cardapio[categoria].find(i => i.id === itemId);
                if (item) {
                    itemSelecionado = item;
                    break;
                }
            }
            
            if (itemSelecionado) {
                pedidoAtual.itens.push(itemSelecionado);
                
                // Mensagem de confirmação
                addMessage(`✅ <strong>${itemSelecionado.nome}</strong> adicionado ao carrinho!`);
                
                // Mostrar opções
                setTimeout(() => {
                    mostrarOpcoesPosAdicao();
                }, 800);
            }
        }
        
        // Função para mostrar o carrinho
        function mostrarCarrinho() {
            if (pedidoAtual.itens.length === 0) {
                addMessage("🛒 Seu carrinho está vazio!");
                mostrarOpcoesPosAdicao();
                return;
            }
            
            let html = `
                <div class="cart">
                    <div class="cart-header">
                        <h3>🛒 SEU CARRINHO</h3>
                        <span>${pedidoAtual.itens.length} itens</span>
                    </div>
            `;
            
            let total = 0;
            
            pedidoAtual.itens.forEach((item, index) => {
                total += item.preco;
                html += `
                    <div class="cart-item">
                        <div>${item.nome}</div>
                        <div>
                            R$ ${item.preco.toFixed(2)}
                            <button class="option-btn" onclick="removerDoCarrinho(${index})" style="margin-left: 8px; padding: 2px 6px; background: #f44336;">✕</button>
                        </div>
                    </div>
                `;
            });
            
            const taxa = total * 0.1;
            const totalComTaxa = total + taxa;
            
            html += `
                    <div class="cart-total">
                        <div class="cart-item">
                            <div>Subtotal:</div>
                            <div>R$ ${total.toFixed(2)}</div>
                        </div>
                        <div class="cart-item">
                            <div>Taxa de Entrega:</div>
                            <div>R$ ${taxa.toFixed(2)}</div>
                        </div>
                        <div class="cart-item">
                            <div>Total:</div>
                            <div><strong>R$ ${totalComTaxa.toFixed(2)}</strong></div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="action-btn add-btn" onclick="mostrarCardapio()">➕ Adicionar Mais</button>
                        <button class="action-btn checkout-btn" onclick="finalizarPedido()">✅ Finalizar Pedido</button>
                        <button class="action-btn cancel-btn" onclick="cancelarPedido()">❌ Cancelar</button>
                    </div>
                </div>
            `;
            
            addMessage(html);
        }
        
        // Função para remover item do carrinho
        function removerDoCarrinho(index) {
            const itemRemovido = pedidoAtual.itens.splice(index, 1)[0];
            addMessage(`🗑️ <strong>${itemRemovido.nome}</strong> removido do carrinho!`);
            setTimeout(() => {
                mostrarCarrinho();
            }, 800);
        }
        
        // Função para mostrar opções após adicionar item
        function mostrarOpcoesPosAdicao() {
            const html = `
                <p>O que deseja fazer agora?</p>
                <div class="options">
                    <button class="option-btn" onclick="mostrarCardapio()">➕ Adicionar Mais Itens</button>
                    <button class="option-btn" onclick="mostrarCarrinho()">🛒 Ver Carrinho</button>
                    <button class="option-btn" onclick="finalizarPedido()">✅ Finalizar Pedido</button>
                    <button class="option-btn" onclick="cancelarPedido()">❌ Cancelar</button>
                </div>
            `;
            
            addMessage(html);
        }
        
        // Função para finalizar o pedido
        function finalizarPedido() {
            if (pedidoAtual.itens.length === 0) {
                addMessage("⚠️ Seu carrinho está vazio! Adicione itens antes de finalizar.");
                return;
            }
            
            // Calcular totais
            let subtotal = 0;
            pedidoAtual.itens.forEach(item => {
                subtotal += item.preco;
            });
            const taxa = subtotal * 0.1;
            const total = subtotal + taxa;
            
            const html = `
                <div class="cart">
                    <h3>✅ PEDIDO CONFIRMADO!</h3>
                    <p>Seu pedido foi recebido e já está sendo preparado!</p>
                    
                    <div class="status">
                        <i class="fas fa-clock"></i>
                        <div>Tempo estimado de entrega: 40-50 minutos</div>
                    </div>
                    
                    <div class="cart-header">
                        <h4>Resumo do Pedido</h4>
                    </div>
                    
                    ${pedidoAtual.itens.map(item => `
                        <div class="cart-item">
                            <div>${item.nome}</div>
                            <div>R$ ${item.preco.toFixed(2)}</div>
                        </div>
                    `).join('')}
                    
                    <div class="cart-total">
                        <div class="cart-item">
                            <div>Subtotal:</div>
                            <div>R$ ${subtotal.toFixed(2)}</div>
                        </div>
                        <div class="cart-item">
                            <div>Taxa de Entrega:</div>
                            <div>R$ ${taxa.toFixed(2)}</div>
                        </div>
                        <div class="cart-item">
                            <div>Total:</div>
                            <div><strong>R$ ${total.toFixed(2)}</strong></div>
                        </div>
                    </div>
                    
                    <p>Acompanharemos seu pedido e avisaremos quando ele sair para entrega!</p>
                    
                    <div class="options">
                        <button class="option-btn" onclick="iniciarNovoPedido()">🆕 Fazer Novo Pedido</button>
                        <button class="option-btn" onclick="iniciarAtendimento()">🏠 Voltar ao Início</button>
                    </div>
                </div>
            `;
            
            addMessage(html);
            
            // Simular atualização de status
            setTimeout(() => {
                const html = `
                    <div class="status">
                        <i class="fas fa-clock"></i>
                        <div>Seu pedido está em preparo! (15 minutos)</div>
                    </div>
                `;
                addMessage(html);
            }, 10000);
            
            setTimeout(() => {
                const html = `
                    <div class="status">
                        <i class="fas fa-motorcycle"></i>
                        <div>Seu pedido saiu para entrega! Chegará em 10-15 minutos.</div>
                    </div>
                `;
                addMessage(html);
            }, 20000);
        }
        
        // Função para cancelar pedido
        function cancelarPedido() {
            pedidoAtual = {
                itens: [],
                estado: "inicio"
            };
            addMessage("❌ Pedido cancelado com sucesso.");
            iniciarAtendimento();
        }
        
        // Função para iniciar novo pedido
        function iniciarNovoPedido() {
            pedidoAtual = {
                itens: [],
                estado: "inicio"
            };
            iniciarAtendimento();
        }
        
        // Função para iniciar atendimento
        function iniciarAtendimento() {
            const html = `
                <p>Como posso ajudar você hoje?</p>
                
                <div class="options">
                    <button class="option-btn" onclick="selectOption('fazer-pedido')">🍔 Fazer Pedido</button>
                    <button class="option-btn" onclick="selectOption('ver-cardapio')">📄 Ver Cardápio</button>
                    <button class="option-btn" onclick="selectOption('status-pedido')">🔄 Status do Pedido</button>
                    <button class="option-btn" onclick="selectOption('falar-atendente')">👨‍🍳 Falar com Atendente</button>
                </div>
            `;
            
            addMessage(html);
        }
        
        // Função para selecionar opção
        function selectOption(option) {
            switch(option) {
                case 'fazer-pedido':
                case 'ver-cardapio':
                    mostrarCardapio();
                    break;
                case 'status-pedido':
                    addMessage("🔍 Verificando status do seu último pedido...");
                    setTimeout(() => {
                        addMessage("✅ Seu pedido está a caminho! Deve chegar em aproximadamente 15 minutos.");
                    }, 1500);
                    break;
                case 'falar-atendente':
                    addMessage("👨‍🍳 Conectando você com um de nossos atendentes...");
                    setTimeout(() => {
                        addMessage("Olá! Sou o Carlos, atendente da hamburgueria. Em que posso ajudar?");
                    }, 2000);
                    break;
            }
        }
        
        // Event Listeners
        sendBtn.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        function sendMessage() {
            const message = userInput.value.trim();
            if (message) {
                addMessage(message, true);
                userInput.value = '';
                
                // Resposta automática do bot
                setTimeout(() => {
                    if (message.toLowerCase().includes('cardápio') || message.toLowerCase().includes('cardapio')) {
                        mostrarCardapio();
                    } else if (message.toLowerCase().includes('carrinho')) {
                        mostrarCarrinho();
                    } else if (message.toLowerCase().includes('pedido') || message.toLowerCase().includes('finalizar')) {
                        finalizarPedido();
                    } else {
                        addMessage("Entendi! Como posso ajudar?");
                        mostrarOpcoesPosAdicao();
                    }
                }, 1000);
            }
        }
        
        // Iniciar o chat
        window.onload = () => {
            setTimeout(() => {
                addMessage("Estou aqui para ajudar você a fazer seu pedido de hambúrguer de forma rápida e fácil!");
            }, 500);
        };
    </script>
</body>
</html>
