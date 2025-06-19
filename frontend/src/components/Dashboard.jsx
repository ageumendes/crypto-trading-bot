import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard({ priceData }) {
  const data = {
    labels: priceData.map(d => d.time.toLocaleTimeString()),
    datasets: [
      {
        label: 'Preço',
        data: priceData.map(d => d.price),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="card p-4">
      <h2 className="card-title h4 mb-4">Gráfico de Preços</h2>
      <Line data={data} />
    </div>
  );
}

export default Dashboard;