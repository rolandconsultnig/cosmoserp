import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Truck } from 'lucide-react';
import Seo from '../components/Seo';

export default function LogisticsPartnersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await api.get('/logistics/providers');
        setProviders(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load logistics partners');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12">
      <Seo
        title="Logistics partners"
        description="Delivery partners integrated with Cosmos Market: GIG, Kobo360, Terminal Africa, and more for nationwide shipping in Nigeria."
        canonicalPath="/logistics"
        type="website"
      />
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Truck className="w-6 h-6" /> Logistics Partners
      </h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-4">
          {providers.length === 0 && <p>No partners available at the moment.</p>}
          {providers.map((p) => (
            <div
              key={p.id}
              className="border p-4 rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold text-lg">{p.name}</h2>
                <p className="text-sm text-gray-600">
                  {p.city}, {p.state}
                </p>
                <p className="text-sm text-gray-600">Rating: {p.rating || 'N/A'}</p>
              </div>
              <a
                href="#"
                className="text-amber-500 hover:underline text-sm"
              >
                View Details
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
