import { useState } from 'react';
     import axios from 'axios';

     function TradeForm({ socket, setStatus }) {
       const backendUrl = 'http://15.228.227.193:3000';
       const [symbol, setSymbol] = useState('DOGE/USDT');
       const [targetProfit, setTargetProfit] = useState(5);
       const [quantity, setQuantity] = useState(1000);
       const [stopLoss, setStopLoss] = useState(5);

       const validateInputs = () => {
         if (!symbol || !/^[A-Z]+\/[A-Z]+$/.test(symbol)) {
           setStatus({ type: 'error', message: 'Símbolo inválido. Use o formato: XXX/YYY (ex.: DOGE/USDT)' });
           return false;
         }
         if (targetProfit < 1 || targetProfit > 10) {
           setStatus({ type: 'error', message: 'Lucro-alvo deve estar entre 1% e 10%' });
           return false;
         }
         if (quantity < 1) {
           setStatus({ type: 'error', message: 'Quantidade mínima é 1 MEMECOIN' });
           return false;
         }
         if (stopLoss < 1 || stopLoss > 20) {
           setStatus({ type: 'error', message: 'Stop-loss deve estar entre 1% e 20%' });
           return false;
         }
         return true;
       };

       const handleConfigSubmit = async () => {
         if (!validateInputs()) return;
         try {
           const response = await axios.post(`${backendUrl}/api/config`, {
             symbol,
             targetProfit,
             quantity: Number(quantity),
             stopLoss: Number(stopLoss),
           });
           setStatus({ type: 'success', message: response.data.message });
           socket.emit('subscribePrice', symbol);
         } catch (error) {
           setStatus({ type: 'error', message: error.response?.data?.details || 'Erro ao salvar configuração' });
         }
       };

       const handleTrade = async (side) => {
         if (!validateInputs()) return;
         try {
           const response = await axios.post(`${backendUrl}/api/trade`, {
             symbol,
             side,
             quantity: Number(quantity),
           });
           setStatus({ type: 'success', message: response.data.message });
         } catch (error) {
           setStatus({ type: 'error', message: error.response?.data?.details || 'Erro ao executar trade' });
         }
       };

       return (
         <div className="card p-4 mb-4">
           <h2 className="card-title h4 mb-4">Configurar Bot</h2>
           <div className="d-flex flex-column gap-3">
             <div>
               <label className="form-label">Símbolo</label>
               <input
                 type="text"
                 value={symbol}
                 onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                 className="form-control"
                 placeholder="Ex: DOGE/USDT"
               />
             </div>
             <div>
               <label className="form-label">Lucro-Alvo (%)</label>
               <input
                 type="number"
                 value={targetProfit}
                 onChange={(e) => setTargetProfit(Number(e.target.value))}
                 min="1"
                 max="10"
                 className="form-control"
               />
             </div>
             <div>
               <label className="form-label">Stop-Loss (%)</label>
               <input
                 type="number"
                 value={stopLoss}
                 onChange={(e) => setStopLoss(Number(e.target.value))}
                 min="1"
                 max="20"
                 className="form-control"
               />
             </div>
             <div>
               <label className="form-label">Quantidade</label>
               <input
                 type="number"
                 value={quantity}
                 onChange={(e) => setQuantity(Number(e.target.value))}
                 className="form-control"
                 min="100"
               />
             </div>
             <button
               onClick={handleConfigSubmit}
               className="btn btn-primary w-100"
             >
               Salvar Configuração
             </button>
             <div className="d-flex gap-3">
               <button
                 onClick={() => handleTrade('buy')}
                 className="btn btn-success flex-fill"
               >
                 Comprar
               </button>
               <button
                 onClick={() => handleTrade('sell')}
                 className="btn btn-danger flex-fill"
               >
                 Vender
               </button>
             </div>
           </div>
         </div>
       );
     }

     export default TradeForm;