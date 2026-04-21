import { useState, useCallback } from 'react';
import type { Task } from '@/types';

// Extended Task type with citizen info
interface TaskWithCitizen extends Task {
  citizen?: {
    firstName: string;
    lastName: string;
    email: string;
    nin: string;
    wilaya?: string;
    commune?: string;
    actYear?: string;
    actNumber?: string;
  };
  documentStatus?: 'pending' | 'verified' | 'rejected' | 'missing';
  requestType?: string;
}

const TACHES_INITIALES: TaskWithCitizen[] = [
  {
    id: '1',
    title: 'Fiche de résidence ',
    assignedTo: '3',
    assignedBy: '1',
    status: 'in-progress',
    createdAt: '2026-01-01',
    requestType: 'Fiche de résidence ',
    documentStatus: 'pending',
    citizen: {
      firstName: 'Ahmed',
      lastName: 'Fassi',
      email: 'ahmed.Fassi@email.com',
      nin: '123456789012300478'
    }
  },
  {
    id: '2',
    title: 'Certificat de résidence',
    assignedTo: '5',
    assignedBy: '1',
    status: 'pending',
    createdAt: '2026-01-02',
    requestType: 'Certificat de résidence',
    documentStatus: 'verified',
    citizen: {
      firstName: 'Samira',
      lastName: 'Trabelsi',
      email: 'samira.trabelsi@email.com',
      nin: '987654321098700056'
    }
  },
  {
    id: '3',
    title: 'Acte de naissance',
    assignedTo: '4',
    assignedBy: '1',
    status: 'completed',
    createdAt: '2023-12-28',
    requestType: 'Acte de naissance',
    documentStatus: 'verified',
    citizen: {
      firstName: 'Mohamed',
      lastName: 'El Amrani',
      email: 'mohamed.amrani@email.com',
      nin: '45678912345678901'
    }
  },
  {
    id: '5',
    title: 'Certificat de mariage',
    assignedTo: '5',
    assignedBy: '1',
    status: 'in-progress',
    createdAt: '2024-01-04',
    requestType: 'Certificat de mariage',
    documentStatus: 'pending',
    citizen: {
      firstName: 'Karim',
      lastName: 'Tazi',
      email: 'karim.tazi@email.com',
      nin: '113216549873200016'
    }
  },
  {
    id: '6',
    title: 'autorisation de voirie',
    assignedTo: '6',
    assignedBy: '1',
    status: 'in-progress',
    createdAt: '2024-01-04',
    requestType: 'autorisation de voirie',
    documentStatus: 'pending',
    citizen: {
      firstName: 'Kamel',
      lastName: 'Tayebi',
      email: 'kamel_tayebi@email.com',
      nin: '113216549873200016'
    }
  },
];

export function useTaches() {
  const [taches, setTaches] = useState<TaskWithCitizen[]>(TACHES_INITIALES);

  // Ajouter une nouvelle tâche
  const ajouterTache = useCallback((tache: Omit<TaskWithCitizen, 'id' | 'createdAt'>) => {
    const nouvelleTache: TaskWithCitizen = {
      ...tache,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTaches((prev) => [...prev, nouvelleTache]);
    return nouvelleTache;
  }, []);

  // Mettre à jour une tâche existante
  const mettreAJourTache = useCallback((id: string, modifications: Partial<TaskWithCitizen>) => {
    setTaches((prev) =>
      prev.map((tache) => (tache.id === id ? { ...tache, ...modifications } : tache))
    );
  }, []);

  // Supprimer une tâche
  const supprimerTache = useCallback((id: string) => {
    setTaches((prev) => prev.filter((tache) => tache.id !== id));
  }, []);

  // Récupérer une tâche par son identifiant
  const getTacheParId = useCallback(
    (id: string) => {
      return taches.find((tache) => tache.id === id);
    },
    [taches]
  );

  // Récupérer les tâches par statut
  const getTachesParStatut = useCallback(
    (statut: Task['status']) => {
      return taches.filter((tache) => tache.status === statut);
    },
    [taches]
  );

  // Marquer une tâche comme terminée
  const terminerTache = useCallback((id: string) => {
    setTaches((prev) =>
      prev.map((tache) =>
        tache.id === id ? { ...tache, status: 'completed' as const } : tache
      )
    );
  }, []);

  return {
    taches,
    ajouterTache,
    mettreAJourTache,
    supprimerTache,
    getTacheParId,
    getTachesParStatut,
    terminerTache,
    tasks: taches,
    addTask: ajouterTache,
    updateTask: mettreAJourTache,
    deleteTask: supprimerTache,
    getTaskById: getTacheParId,
    getTasksByStatus: getTachesParStatut,
    getTasksByEmployee: (employeeId: string) => taches.filter((t) => t.assignedTo === employeeId),
    completeTask: terminerTache,
  };
}