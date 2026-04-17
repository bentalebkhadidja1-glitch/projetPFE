import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/apiBase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Request {
  _id: string;
  citizen: {
    firstName: string;
    lastName: string;
    email: string;
    nin: string;
    phone: string;
  };
  subject: string;
  description: string;
  status: string;
  documentStatus: string;
  createdAt: string;
}

export function EmployeeRequestValidation({ employeeId }: { position: string; employeeId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [employeeId]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/requests/my-requests/${employeeId}`);
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      toast.error('Erreur de chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (requestId: string, status: string, documentStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/requests/validate/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, documentStatus, notes: '' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Demande ${status === 'completed' ? 'approuvée' : 'mise à jour'}!`);
        if (data.emailSent) {
          toast.info('Email de confirmation envoyé au citoyen');
        }
        fetchRequests(); // Refresh list
      }
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Demandes à traiter</h2>
      
      {requests.map((request) => (
        <div key={request._id} className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{request.subject}</h3>
              <p className="text-sm text-gray-600">
                {request.citizen.firstName} {request.citizen.lastName}
              </p>
              <p className="text-xs text-gray-500">NIN: {request.citizen.nin}</p>
              <p className="text-xs text-gray-500">{request.citizen.email}</p>
            </div>
            <Badge className={getStatusColor(request.status)}>
              {request.status}
            </Badge>
          </div>
          
          <p className="mt-2 text-sm">{request.description}</p>
          
          <div className="mt-4 flex gap-2">
            <Button 
              size="sm" 
              onClick={() => handleValidate(request._id, 'in-progress', 'pending')}
              disabled={request.status !== 'pending'}
            >
              Prendre en charge
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleValidate(request._id, 'completed', 'verified')}
              disabled={request.status === 'completed'}
            >
              Approuver & Envoyer email
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => handleValidate(request._id, 'rejected', 'rejected')}
            >
              Rejeter
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    default: return 'bg-yellow-100 text-yellow-800';
  }
}