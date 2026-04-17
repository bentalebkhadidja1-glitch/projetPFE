export interface Citizen {
  id: string;
  firstName: string;
  lastName: string;
  nin: string;
  email: string;
  phone: string;
  wilaya?: string;
  commune?: string;
  actYear?: string;
  actNumber?: string;
  // fiche de résidence (Fatima)
  cni?: string;
  cniFileUrl?: string;
  factureFileUrl?: string;
  dateNaissance?: string;
  adresse?: string;
}

export interface CitizenRequest {
  id: string;
  citizenId: string;
  citizen: Citizen;
  type: 'document' | 'information' | 'complaint' | 'other';
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  assignedPosition?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface EmployeeNotification {
  
  id: string;
  type: 'new-request' | 'request-updated' | 'request-assigned';
  title: string;
  message: string;
  requestId?: string;
  citizenName?: string;
  citizenNin?: string;
  citizenEmail?: string;
  // Acte de naissance (Sarah)
  wilaya?: string;
  commune?: string;
  citizenFirstName?: string;
  citizenLastName?: string;
  actYear?: string;
  actNumber?: string;
  // fiche de résidence(Fatima)
  cni?: string;
  cniFileUrl?: string;
  factureFileUrl?: string;
  dateNaissance?: string;
  adresse?: string;
  position?: string;
  read: boolean;
  createdAt: string;
}