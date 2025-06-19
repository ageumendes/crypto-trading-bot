import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeStatus from './components/TradeStatus';
import BalanceDisplay from './BalanceDisplay';

const socket = io('http://localhost:3000');

function App() {
  const [priceData, setPriceData] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    socket.on('priceUpdate', ({ symbol, price }) => {
      setPriceData(prev => [...prev.slice(-50), { time: new Date(), price }]);
    });

    return () => socket.off('priceUpdate');
  }, []);

  return (
    <div className="container-fluid bg-light min-vh-100 py-4">
      <h1 className="display-4 fw-bold text-center mb-4">Bot de Trading de Criptomoedas</h1>
      <div className="row g-4">
        <div className="col-md-6">
          <BalanceDisplay />
          <Dashboard priceData={priceData} />
        </div>
        <div className="col-md-6">
          <TradeForm socket={socket} setStatus={setStatus} />
          <TradeStatus status={status} />
        </div>
      </div>
    </div>
  );
}

export default App;