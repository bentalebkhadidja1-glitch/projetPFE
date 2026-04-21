import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, User, Phone, Mail, MapPin, Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface DocumentRequest {
  id: string;
  citizenId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: 'birth' |'marriage' | 'residence' | 'nationality' | 'other';
  fullNameOnDocument?: string;
  birthDate?: string;
  birthPlace?: string;
  fatherName?: string;
  motherName?: string;
  requestReason: string;
  copiesCount: number;
  deliveryMethod: 'pickup' | 'delivery';
  address?: string;
  attachments: string[];
  status: 'pending' | 'processing' | 'ready' | 'delivered' | 'rejected';
  createdAt: string;
  estimatedReadyDate?: string;
}

interface DocumentRequestFormProps {
  citizenId: string;
  onSubmit: (request: Omit<DocumentRequest, 'id' | 'createdAt' | 'status'>) => void;
}

const documentTypes = [
  { value: 'birth', label: 'Acte de naissance', description: 'Extrait d\'acte de naissance' },
  { value: 'marriage', label: 'Acte de mariage',description: 'Certificat de mariage' },
  { value: 'residence', label: 'Fiche de Résidence', description: 'Attestation de résidence' },
  { value: 'residence', label: 'Certificat de résidence',  description: 'Certificat de résidence' },
  { value: 'tichnical', label: 'Authorisation de voirie', description: 'Authorisation de voirie' },
];

export function DocumentRequestForm({ citizenId, onSubmit }: DocumentRequestFormProps) {
  const [step, setStep] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    fullNameOnDocument: '',
    birthDate: '',
    birthPlace: '',
    fatherName: '',
    motherName: '',
    requestReason: '',
    copiesCount: 1,
    deliveryMethod: 'pickup' as 'pickup' | 'delivery',
    address: '',
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const requestData = {
      citizenId,
      ...formData,
      documentType: selectedDocument as DocumentRequest['documentType'],
      attachments: [],
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onSubmit(requestData);
    toast.success('Demande soumise avec succès ! Vous recevrez une notification lorsque votre document sera prêt.');
    setIsSubmitting(false);
    setStep(1);
    setSelectedDocument('');
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Sélectionnez le type de document</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTypes.map((doc) => (
          <button
            key={doc.value}
            onClick={() => {
              setSelectedDocument(doc.value);
              setStep(2);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
              selectedDocument === doc.value
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-3">
              
              <div>
                <p className="font-semibold text-slate-900">{doc.label}</p>
                <p className="text-sm text-slate-500">{doc.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-sm text-primary hover:underline"
        >
          ← Retour
        </button>
        <Badge variant="outline" className="ml-auto">
          {documentTypes.find(d => d.value === selectedDocument)?.label}
        </Badge>
      </div>

      {/* Informations personnelles */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4" />
          Informations personnelles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Votre prénom"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Votre nom"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Téléphone *
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="05XX XX XX XX"
              required
            />
          </div>
        </div>
      </div>

      {/* Informations du document */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Informations du document demandé
        </h4>

        {(selectedDocument === 'birth' || selectedDocument === 'death' || selectedDocument === 'marriage') && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullNameOnDocument">Nom complet sur l'acte *</Label>
              <Input
                id="fullNameOnDocument"
                value={formData.fullNameOnDocument}
                onChange={(e) => handleInputChange('fullNameOnDocument', e.target.value)}
                placeholder="Nom complet tel qu'il apparaît sur l'acte"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de naissance *
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthPlace" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lieu de naissance *
                </Label>
                <Input
                  id="birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                  placeholder="Commune, Wilaya"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Nom du père</Label>
                <Input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  placeholder="Nom complet du père"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Nom de la mère</Label>
                <Input
                  id="motherName"
                  value={formData.motherName}
                  onChange={(e) => handleInputChange('motherName', e.target.value)}
                  placeholder="Nom complet de la mère"
                />
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="requestReason">Motif de la demande *</Label>
          <Textarea
            id="requestReason"
            value={formData.requestReason}
            onChange={(e) => handleInputChange('requestReason', e.target.value)}
            placeholder="Précisez le motif de votre demande (administratif, professionnel, etc.)"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="copiesCount">Nombre de copies *</Label>
            <Select
              value={formData.copiesCount.toString()}
              onValueChange={(value) => handleInputChange('copiesCount', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} copie{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryMethod">Mode de retrait *</Label>
            <Select
              value={formData.deliveryMethod}
              onValueChange={(value) => handleInputChange('deliveryMethod', value as 'pickup' | 'delivery')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Retrait à la mairie</SelectItem>
                <SelectItem value="delivery">Livraison à domicile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.deliveryMethod === 'delivery' && (
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adresse de livraison *
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Adresse complète (rue, immeuble, étage, commune, wilaya)"
              required
            />
          </div>
        )}
      </div>

      {/* Pièces jointes */}
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Pièces justificatives
        </h4>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Cliquez pour télécharger ou glissez-déposez vos fichiers</p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 5 Mo)</p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Soumettre la demande
            </>
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          Demande de document
        </CardTitle>
        <CardDescription>
          Remplissez le formulaire ci-dessous pour demander un document officiel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
        </div>

        {step === 1 ? renderStep1() : renderStep2()}
      </CardContent>
    </Card>
  );
}
