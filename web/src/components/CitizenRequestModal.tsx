import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  Download,
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/apiBase';

interface Citizen {
  firstName: string;
  lastName: string;
  email: string;
  nin: string;
  phone: string;
  address: string;
  wilaya?: string;
  commune?: string;
  actYear?: string;
  actNumber?: string;
}

interface RequestData {
  _id: string;
  citizen: Citizen;
  subject: string;
  description: string;
  status: string;
  documentStatus: string;
  serviceType: string;
  createdAt: string;
  comment?: string;
}

interface CitizenRequestModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  position: string;
  onValidationComplete: () => void;
  language?: 'fr' | 'en';
}

export function CitizenRequestModal({ 
  requestId, 
  isOpen, 
  onClose, 
  position,
  onValidationComplete,
  language = 'fr',
}: CitizenRequestModalProps) {
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [comment, setComment] = useState('');

  // Translations
  const tr = {
    title: language === 'fr' ? 'Traitement de la Demande' : 'Process Request',
    citizenInfo: language === 'fr' ? 'Informations du Citoyen' : 'Citizen Information',
    requestDetails: language === 'fr' ? 'Détails de la Demande' : 'Request Details',
    description: language === 'fr' ? 'Description' : 'Description',
    service: language === 'fr' ? 'Service' : 'Service',
    submissionDate: language === 'fr' ? 'Date de soumission' : 'Submission Date',
    comment: language === 'fr' ? 'Commentaire (optionnel)' : 'Comment (optional)',
    commentPlaceholder: language === 'fr' ? 'Ajouter un commentaire pour le citoyen...' : 'Add a comment for the citizen...',
    approve: language === 'fr' ? 'Approuver & Envoyer PDF' : 'Approve & Send PDF',
    reject: language === 'fr' ? 'Rejeter' : 'Reject',
    processing: language === 'fr' ? 'Traitement en cours...' : 'Processing...',
    downloadPDF: language === 'fr' ? 'Télécharger le PDF' : 'Download PDF',
    close: language === 'fr' ? 'Fermer' : 'Close',
    infoTitle: language === 'fr' ? 'Information' : 'Information',
    infoText: language === 'fr'
      ? 'En approuvant cette demande, un PDF contenant toutes les informations sera généré et envoyé automatiquement à l\'adresse email du citoyen'
      : 'By approving this request, a PDF will be generated and automatically sent to the citizen\'s email address',
    loading: language === 'fr' ? 'Chargement...' : 'Loading...',
    status: {
      completed: language === 'fr' ? 'Terminé' : 'Completed',
      rejected: language === 'fr' ? 'Rejeté' : 'Rejected',
      'in-progress': language === 'fr' ? 'En cours (Docs Manquants)' : 'In Progress (Missing Docs)',
      pending: language === 'fr' ? 'En attente' : 'Pending',
    },
    missingDocsText: language === 'fr' ? 'Signaler Docs Manquants' : 'Report Missing Docs',
    missingDocsAlert: language === 'fr' ? 'Veuillez préciser quels documents manquent dans le commentaire.' : 'Please specify which documents are missing in the comment.',
    birthActInfo: language === 'fr' ? 'Informations Acte de Naissance' : 'Birth Certificate Information',
    wilaya: language === 'fr' ? 'Wilaya' : 'Wilaya',
    commune: language === 'fr' ? 'Commune' : 'Commune',
    actYear: language === 'fr' ? "Année de l'acte" : 'Act Year',
    actNumber: language === 'fr' ? "N° de l'acte" : 'Act Number',
    };

  useEffect(() => {
    if (requestId && isOpen) {
      fetchRequestDetails();
    }
  }, [requestId, isOpen]);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/requests/request/${requestId}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequest(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateAndSend = async (status: 'completed' | 'rejected' | 'in-progress') => {
    if (!request) return;
    
    setValidating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/requests/validate-with-pdf/${request._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            documentStatus: status === 'completed' ? 'valid' : status === 'in-progress' ? 'missing' : 'rejected',
            comment,
            position,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          status === 'completed' 
            ? ' Demande approuvée et email envoyé avec PDF!' 
            : status === 'in-progress'
            ? ' Dossier marqué comme incomplet (documents manquant)!'
            : ' Demande rejetée et notification envoyée!'
        );
        
        if (data.emailSent) {
          toast.info(` Email envoyé à ${request.citizen.email}`);
        }
        
        onValidationComplete();
        onClose();
      } else {
        throw new Error(data.message || 'Erreur lors de la validation');
      }
    } catch (error) {
      toast.error('Erreur lors de la validation');
      console.error(error);
    } finally {
      setValidating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!request) return;
    window.open(`${API_BASE_URL}/requests/download-pdf/${request._id}`, '_blank');
    toast.success('Téléchargement du PDF démarré');
  };

  const normalizeStatus = (status: string) => (status === 'in_progress' ? 'in-progress' : status);

  const getStatusColor = (status: string) => {
    const s = normalizeStatus(status);
    switch (s) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const s = normalizeStatus(status);
    return tr.status[s as keyof typeof tr.status] || s;
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">{tr.loading}</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {tr.title}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                Réf: {request._id} • Soumise le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
              </DialogDescription>
            </div>
            <Badge className={`${getStatusColor(request.status)} px-3 py-1 text-sm font-semibold`}>
              {getStatusLabel(request.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Citizen Information Card */}
          <Card className="border-l-4 border-l-blue-500 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <User className="w-5 h-5 text-blue-500" />
                {tr.citizenInfo}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {request.citizen.firstName[0]}{request.citizen.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {request.citizen.firstName} {request.citizen.lastName}
                  </p>
                  <p className="text-sm text-slate-500">Citoyen</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">{request.citizen.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600 dark:text-slate-300">{request.citizen.phone || 'Non spécifié'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-slate-600 dark:text-slate-300">{request.citizen.nin || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">{request.citizen.address || 'Non spécifiée'}</span>
                </div>
                {(request.citizen.wilaya ||
                  request.citizen.commune ||
                  request.citizen.actYear ||
                  request.citizen.actNumber) && (
                  <>
                    <Separator />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tr.birthActInfo}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {request.citizen.wilaya ? (
                        <div>
                          <span className="text-slate-500">{tr.wilaya}</span>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{request.citizen.wilaya}</p>
                        </div>
                      ) : null}
                      {request.citizen.commune ? (
                        <div>
                          <span className="text-slate-500">{tr.commune}</span>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{request.citizen.commune}</p>
                        </div>
                      ) : null}
                      {request.citizen.actYear ? (
                        <div>
                          <span className="text-slate-500">{tr.actYear}</span>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{request.citizen.actYear}</p>
                        </div>
                      ) : null}
                      {request.citizen.actNumber ? (
                        <div>
                          <span className="text-slate-500">{tr.actNumber}</span>
                          <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{request.citizen.actNumber}</p>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Request Details Card */}
          <Card className="border-l-4 border-l-amber-500 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <FileText className="w-5 h-5 text-amber-500" />
                {tr.requestDetails}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  {request.subject}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">{tr.description}</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {request.description || (language === 'fr' ? 'Aucune description fournie' : 'No description provided')}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">{tr.service}</label>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
                      {request.serviceType || (language === 'fr' ? 'Non spécifié' : 'Not specified')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">{tr.submissionDate}</label>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comment Section */}
        {request.status === 'pending' && (
          <div className="mt-6">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              {tr.comment}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tr.commentPlaceholder}
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
          {request.status === 'pending' ? (
            <>
              <Button
                onClick={() => handleValidateAndSend('completed')}
                disabled={validating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {tr.processing}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {tr.approve}
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleValidateAndSend('rejected')}
                disabled={validating}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-12 text-base font-semibold"
              >
                <XCircle className="w-5 h-5 mr-2" />
                {tr.reject}
              </Button>
              
              <Button
                onClick={() => {
                  if (!comment.trim()) {
                    toast.error(tr.missingDocsAlert);
                    return;
                  }
                  handleValidateAndSend('in-progress');
                }}
                disabled={validating}
                variant="outline"
                className="flex-1 border-amber-300 text-amber-600 hover:bg-amber-50 h-12 text-base font-semibold"
              >
                <FileText className="w-5 h-5 mr-2" />
                {tr.missingDocsText}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleDownloadPDF}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
              >
                <Download className="w-5 h-5 mr-2" />
                {tr.downloadPDF}
              </Button>

              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 h-12 text-base font-semibold"
              >
                {tr.close}
              </Button>
            </>
          )}
        </div>

        {/* Info Alert */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">{tr.infoTitle}</p>
              <p>{tr.infoText} ({request.citizen.email}).</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}