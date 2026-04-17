export interface Citizen {
  id: string;
  firstName: string;
  lastName: string;
  nin: string; // National Identification Number
  email: string;
  phone: string;
  
}

export interface CitizenRequest {
  id: string;
  citizenId: string;
  citizen: Citizen;
  type: 'document' | 'information' | 'complaint' | 'other';
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  position?: string;     // position  only 
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface EmployeeNotification {
  id: string;
  type: 'new-request' | 'request-updated' | 'request-assigned';
  title: string;
  message: string;
  requestId: string;
  citizenName: string;
  citizenNin: string;
  read: boolean;
  createdAt: string;
}
 