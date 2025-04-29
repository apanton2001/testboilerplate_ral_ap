import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ForwarderInfo {
  code: string;
  name: string;
  connected?: boolean;
  connectedAt?: string;
}

interface FreightStatus {
  connected: boolean;
  forwarders: Record<string, ForwarderInfo>;
}

const FreightIntegration = () => {
  const { data: session } = useSession();
  const [status, setStatus] = useState<FreightStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForwarder, setSelectedForwarder] = useState<string>('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [shipmentStatus, setShipmentStatus] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);

  // Fetch freight forwarder connection status
  const fetchStatus = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/status', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch integration status');
      }
      
      const data = await response.json();
      setStatus(data.integrations.freight);
    } catch (err) {
      console.error('Error fetching freight forwarder status:', err);
      setError('Failed to load freight forwarder integration status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch supported freight forwarders
  const fetchSupportedForwarders = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/v1/integrations/freight/supported', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch supported freight forwarders');
      }
      
      const data = await response.json();
      
      // Initialize status with supported forwarders if not already set
      if (!status) {
        const forwarders: Record<string, ForwarderInfo> = {};
        data.forwarders.forEach((forwarder: ForwarderInfo) => {
          forwarders[forwarder.code] = {
            ...forwarder,
            connected: false
          };
        });
        
        setStatus({
          connected: false,
          forwarders
        });
      }
      
      // Set default selected forwarder if none selected
      if (!selectedForwarder && data.forwarders.length > 0) {
        setSelectedForwarder(data.forwarders[0].code);
      }
    } catch (err) {
      console.error('Error fetching supported freight forwarders:', err);
    }
  };

  // Connect to freight forwarder
  const connectFreightForwarder = async () => {
    if (!session || !selectedForwarder) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/freight/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          forwarder: selectedForwarder,
          credentials
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to freight forwarder');
      }
      
      // Update status
      await fetchStatus();
      
      // Clear credentials
      setCredentials({});
    } catch (err) {
      console.error('Error connecting to freight forwarder:', err);
      setError('Failed to connect to freight forwarder');
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from freight forwarder
  const disconnectFreightForwarder = async (forwarderCode: string) => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/freight/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          forwarder: forwarderCode
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect from freight forwarder');
      }
      
      // Update status
      await fetchStatus();
    } catch (err) {
      console.error('Error disconnecting from freight forwarder:', err);
      setError('Failed to disconnect from freight forwarder');
    } finally {
      setLoading(false);
    }
  };

  // Track shipment
  const trackShipment = async () => {
    if (!session || !selectedForwarder || !trackingNumber) return;

    try {
      setTrackingLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/integrations/freight/shipment/${selectedForwarder}/${trackingNumber}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get shipment status');
      }
      
      const data = await response.json();
      setShipmentStatus(data.status);
    } catch (err) {
      console.error('Error tracking shipment:', err);
      setError('Failed to get shipment status');
      setShipmentStatus(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Handle credential input change
  const handleCredentialChange = (key: string, value: string) => {
    setCredentials({
      ...credentials,
      [key]: value
    });
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get credential fields based on selected forwarder
  const getCredentialFields = () => {
    switch (selectedForwarder) {
      case 'FLEXPORT':
        return [
          { key: 'apiToken', label: 'API Token', type: 'password' }
        ];
      case 'KUEHNE_NAGEL':
        return [
          { key: 'username', label: 'Username', type: 'text' },
          { key: 'password', label: 'Password', type: 'password' }
        ];
      case 'DHL':
        return [
          { key: 'apiKey', label: 'API Key', type: 'password' }
        ];
      default:
        return [];
    }
  };

  // Load status on component mount
  useEffect(() => {
    if (session) {
      fetchStatus();
      fetchSupportedForwarders();
    }
  }, [session]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Freight Forwarder Integration</h2>
      
      {loading && !status ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <>
          {/* Connected Forwarders */}
          {status && Object.values(status.forwarders).some(f => f.connected) && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-3">Connected Forwarders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(status.forwarders)
                  .filter(forwarder => forwarder.connected)
                  .map(forwarder => (
                    <div key={forwarder.code} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{forwarder.name}</h4>
                          <p className="text-sm text-gray-500">
                            Connected since: {formatDate(forwarder.connectedAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => disconnectFreightForwarder(forwarder.code)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          disabled={loading}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Connect New Forwarder */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Connect New Forwarder</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="forwarder-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Freight Forwarder
                </label>
                <select
                  id="forwarder-select"
                  value={selectedForwarder}
                  onChange={(e) => setSelectedForwarder(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a forwarder</option>
                  {status && Object.values(status.forwarders)
                    .filter(forwarder => !forwarder.connected)
                    .map(forwarder => (
                      <option key={forwarder.code} value={forwarder.code}>
                        {forwarder.name}
                      </option>
                    ))}
                </select>
              </div>
              
              {selectedForwarder && (
                <>
                  <div className="space-y-3">
                    {getCredentialFields().map(field => (
                      <div key={field.key}>
                        <label htmlFor={`credential-${field.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <input
                          id={`credential-${field.key}`}
                          type={field.type}
                          value={credentials[field.key] || ''}
                          onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={connectFreightForwarder}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                    disabled={loading || getCredentialFields().some(field => !credentials[field.key])}
                  >
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Track Shipment */}
          {status && status.connected && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Track Shipment</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="tracking-forwarder" className="block text-sm font-medium text-gray-700 mb-1">
                      Forwarder
                    </label>
                    <select
                      id="tracking-forwarder"
                      value={selectedForwarder}
                      onChange={(e) => setSelectedForwarder(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {Object.values(status.forwarders)
                        .filter(forwarder => forwarder.connected)
                        .map(forwarder => (
                          <option key={forwarder.code} value={forwarder.code}>
                            {forwarder.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tracking-number" className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number
                    </label>
                    <input
                      id="tracking-number"
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter tracking number"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={trackShipment}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded w-full"
                      disabled={trackingLoading || !trackingNumber}
                    >
                      {trackingLoading ? 'Tracking...' : 'Track'}
                    </button>
                  </div>
                </div>
                
                {shipmentStatus && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Shipment Status</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Tracking Number</p>
                        <p className="font-medium">{shipmentStatus.trackingNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium">{shipmentStatus.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Current Location</p>
                        <p className="font-medium">{shipmentStatus.currentLocation || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Estimated Delivery</p>
                        <p className="font-medium">{formatDate(shipmentStatus.estimatedDelivery)}</p>
                      </div>
                    </div>
                    
                    {shipmentStatus.events && shipmentStatus.events.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Tracking History</h5>
                        <div className="border rounded overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Location
                                </th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Description
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {shipmentStatus.events.map((event: any, index: number) => (
                                <tr key={index}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    {formatDate(event.timestamp)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    {event.location || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {event.description}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FreightIntegration;