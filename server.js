<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BurgerBot Premium</title>
  <style>
    :root {
      --primary: #ff5722;
      --secondary: #ff9800;
      --dark: #333;
      --light: #f5f5f5;
      --success: #4caf50;
      --danger: #f44336;
    }
    
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
      background: var(--primary);
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
      gap: 15px;
    }
    
    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
      animation: fadeIn 0.3s ease;
      line-height: 1.5;
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
      background: var(--success);
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
      background: var(--secondary);
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 15px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .option-btn:hover {
      background: #e68a00;
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
      background: var(--primary);
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
    
    .cart-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .cart-total {
      font-weight: bold;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid var(--success);
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
        <p>Estou carregando nosso cardápio especial...</p>
      </div>
    </div>
    
    <div class="input-container">
      <input type="text" id="user-input" placeholder="Digite sua mensagem..." autocomplete="off">
      <button id="send-btn">➤</button>
    </div>
  </div>

  <script>
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    // Gerar ID de sessão único
    const sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Função para adicionar mensagens ao chat
    function addMessage(message, isUser = false, options = []) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
      messageDiv.innerHTML = message;
      
      if (options.length > 0) {
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('options');
        
        options.forEach(option => {
          const button = document.createElement('button');
          button.classList.add('option-btn');
          button.textContent = option.label;
          button.dataset.value = option.value;
          button.onclick = () => sendOption(option.value);
          optionsDiv.appendChild(button);
        });
        
        messageDiv.appendChild(optionsDiv);
      }
      
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Função para enviar opção
    function sendOption(value) {
      addMessage(value, true);
      processMessage(value);
    }
    
    // Função para enviar mensagem
    function sendMessage() {
      const message = userInput.value.trim();
      if (message) {
        addMessage(message, true);
        userInput.value = '';
        processMessage(message);
      }
    }
    
    // Processar mensagens via API
    async function processMessage(message) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message })
        });
        
        const data = await response.json();
        addMessage(data.response, false, data.options);
      } catch (error) {
        console.error('Erro:', error);
        addMessage('⚠️ Ocorreu um erro. Tente novamente.', false);
      }
    }
    
    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    
    // Iniciar conversa
    window.onload = () => {
      processMessage('inicio');
    };
  </script>
</body>
</html>
