import { useState, useEffect } from 'react';
import axios from 'axios';

function BalanceDisplay() {
  const [balances, setBalances] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/balances');
        setBalances(response.data);
      } catch (err) {
        setError('Erro ao carregar saldos: ' + (err.response?.data?.details || err.message));
      }
    };
    fetchBalances();
    const interval = setInterval(fetchBalances, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card p-4 mb-4">
      <h2 className="card-title h4 mb-4">Saldos de Criptomoedas</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {balances.length === 0 && !error ? (
        <p>Nenhum saldo disponível.</p>
      ) : (
        <ul className="list-group">
          {balances.map(({ currency, amount }) => (
            <li key={currency} className="list-group-item">
              {currency}: {amount.toFixed(8)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BalanceDisplay;