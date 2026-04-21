import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'fr' | 'en';


const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    tasks: 'Mes tâches',
    profile: 'Mon profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    login: 'Connexion',

    // Common
    welcome: 'Bienvenue',
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    create: 'Créer',
    search: 'Rechercher',
    filter: 'Filtrer',
    actions: 'Actions',
    status: 'Statut',

    // Employee Dashboard
    myTasks: 'Mes tâches',
    pending: 'En attente',
    inProgress: 'En cours',
    completed: 'Terminé',
    rejected: 'Rejeté',
    totalTasks: 'Total des tâches',
    toProcess: 'À traiter',
    done: 'Terminé',
    unreadMessages: 'Messages non lus',
    completionRate: 'Taux d\'achèvement',
    tasksDone: 'Tâches effectuées',

    // Citizen/Request
    citizen: 'Citoyen',
    citizenInfo: 'Informations du Citoyen',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    address: 'Adresse',
    nin: 'NIN',
    wilaya: 'Wilaya',
    commune: 'Commune',
    birthActYear: 'Année de l\'acte',
    birthActNumber: 'N° de l\'acte',
    requestDetails: 'Détails de la Demande',
    subject: 'Sujet',
    description: 'Description',
    service: 'Service',
    submissionDate: 'Date de soumission',

    // Actions
    process: 'Traiter',
    view: 'Voir',
    approve: 'Approuver',
    approveAndSendPDF: 'Approuver & Envoyer PDF',
    reject: 'Rejeter',
    downloadPDF: 'Télécharger PDF',
    close: 'Fermer',

    // Modal
    processRequest: 'Traitement de la Demande',
    comment: 'Commentaire',
    optional: 'optionnel',
    addComment: 'Ajouter un commentaire pour le citoyen...',
    pdfInfo: 'En approuvant cette demande, un PDF contenant toutes les informations sera généré et envoyé automatiquement à l\'adresse email du citoyen',

    // Notifications
    requestApproved: 'Demande approuvée et email envoyé avec PDF!',
    requestRejected: 'Demande rejetée et notification envoyée!',
    emailSentTo: 'Email envoyé à',
    errorLoading: 'Erreur lors du chargement',
    errorValidation: 'Erreur lors de la validation',
    pdfDownloaded: 'PDF téléchargé avec succès',

    // Municipal Agent
    employees: 'Employés',
    recentEmployees: 'Employés récents',
    recentlyAdded: 'Membres récemment ajoutés',
    allRequests: 'Toutes les demandes',
    statistics: 'Statistiques',
    addEmployee: 'Ajouter un employé',

    // ── Add new words here (fr) ──
    // newWord: 'Nouvelle traduction',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    tasks: 'My Tasks',
    profile: 'My Profile',
    settings: 'Settings',
    logout: 'Logout',
    login: 'Login',

    // Common
    welcome: 'Welcome',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    filter: 'Filter',
    actions: 'Actions',
    status: 'Status',

    // Employee Dashboard
    myTasks: 'My Tasks',
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    rejected: 'Rejected',
    totalTasks: 'Total Tasks',
    toProcess: 'To Process',
    done: 'Done',
    unreadMessages: 'Unread Messages',
    completionRate: 'Completion Rate',
    tasksDone: 'Tasks Done',

    // Citizen/Request
    citizen: 'Citizen',
    citizenInfo: 'Citizen Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    nin: 'NIN',
    wilaya: 'Wilaya',
    commune: 'Commune',
    birthActYear: 'Year of act',
    birthActNumber: 'Act number',
    requestDetails: 'Request Details',
    subject: 'Subject',
    description: 'Description',
    service: 'Service',
    submissionDate: 'Submission Date',

    // Actions
    process: 'Process',
    view: 'View',
    approve: 'Approve',
    approveAndSendPDF: 'Approve & Send PDF',
    reject: 'Reject',
    downloadPDF: 'Download PDF',
    close: 'Close',

    // Modal
    processRequest: 'Process Request',
    comment: 'Comment',
    optional: 'optional',
    addComment: 'Add a comment for the citizen...',
    pdfInfo: 'By approving this request, a PDF containing all information will be generated and automatically sent to the citizen\'s email address',

    // Notifications
    requestApproved: 'Request approved and email sent with PDF!',
    requestRejected: 'Request rejected and notification sent!',
    emailSentTo: 'Email sent to',
    errorLoading: 'Error loading data',
    errorValidation: 'Error during validation',
    pdfDownloaded: 'PDF downloaded successfully',

    // Municipal Agent
    employees: 'Employees',
    recentEmployees: 'Recent Employees',
    recentlyAdded: 'Recently added members',
    allRequests: 'All Requests',
    statistics: 'Statistics',
    addEmployee: 'Add Employee',

  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;