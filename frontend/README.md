Bot de Trading de Criptomoedas
Um bot de trading para criptomoedas que opera na Binance, com frontend em React (Vite) e backend em Node.js.
Pré-requisitos

Node.js (v16 ou superior)
Conta na Binance com chaves API

Instalação
Backend

Navegue até a pasta backend:cd backend


Instale as dependências:npm install


Crie um arquivo .env com suas chaves da Binance:BINANCE_API_KEY=your_binance_api_key
BINANCE_SECRET_KEY=your_binance_secret_key


Inicie o servidor:node src/server.js



Frontend

Navegue até a pasta frontend:cd frontend


Instale as dependências:npm install


Inicie o Vite:npm run dev


Acesse http://localhost:5173 no navegador.

Funcionalidades

Dashboard: Gráfico de preços em tempo real com react-chartjs-2.
Formulário: Configure símbolo (ex.: DOGE/USDT), lucro-alvo (1-10%) e quantidade.
Trades Manuais: Botões para comprar/vender.
Status: Exibe mensagens de sucesso/erro.
Backend: Usa ccxt para Binance, socket.io para WebSocket e estratégia de média móvel.

Notas

Teste com pequenas quantidades ou conta demo.
Substitua as chaves no .env pelas suas credenciais reais da Binance.

