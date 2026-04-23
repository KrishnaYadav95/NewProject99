import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  getDocs,
  where,
  updateDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Report {
  id: string;
  rawText: string;
  category: string;
  urgencyScore: number;
  priorityScore: number;
  summary: string;
  keywords: string[];
  location: { latitude: number; longitude: number };
  createdAt: any;
  status: "pending" | "assigned" | "resolved";
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  isAvailable: boolean;
  location: { latitude: number; longitude: number };
  skills: string[];
}

export const reportsCollection = collection(db, "reports");
export const volunteersCollection = collection(db, "volunteers");

export async function createReport(data: Omit<Report, 'id' | 'createdAt'>) {
  return await addDoc(reportsCollection, {
    ...data,
    createdAt: serverTimestamp()
  });
}

export function subscribeToReports(callback: (reports: Report[]) => void) {
  const q = query(reportsCollection, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Report[];
    callback(reports);
  });
}

export function subscribeToVolunteers(callback: (volunteers: Volunteer[]) => void) {
  return onSnapshot(volunteersCollection, (snapshot) => {
    const volunteers = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Volunteer[];
    callback(volunteers);
  });
}

export async function fetchNearbyVolunteers(lat: number, lon: number) {
  // Simple retrieval of all available volunteers
  const q = query(volunteersCollection, where("isAvailable", "==", true));
  const snapshot = await getDocs(q);
  const volunteers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Handled on client for now or passed to backend
  return volunteers;
}

export async function assignVolunteer(reportId: string, volunteerId: string, volunteerName: string) {
  const reportRef = doc(db, "reports", reportId);
  await updateDoc(reportRef, {
    assignedVolunteerId: volunteerId,
    assignedVolunteerName: volunteerName,
    status: "assigned"
  });
}

export async function updateVolunteerLocation(volunteerId: string, location: { latitude: number, longitude: number }) {
  const volRef = doc(db, "volunteers", volunteerId);
  await updateDoc(volRef, { location });
}

export async function createVolunteer(data: Omit<Volunteer, 'id'>) {
  return await addDoc(volunteersCollection, data);
}

export async function seedVolunteers() {
  const volunteers = [
    { name: "Alpha Response", location: { latitude: -37.8368, longitude: 144.928 }, isAvailable: true, skills: ["Medical", "Search & Rescue"] },
    { name: "Bravo Unit", location: { latitude: -37.83, longitude: 144.93 }, isAvailable: true, skills: ["Infrastructure", "Firefighting"] },
    { name: "Charlie Support", location: { latitude: -37.84, longitude: 144.92 }, isAvailable: true, skills: ["Food Supply", "Logistics"] },
    { name: "Delta Medical", location: { latitude: -37.835, longitude: 144.925 }, isAvailable: true, skills: ["First Aid", "Trauma Care"] }
  ];

  for (const vol of volunteers) {
    await addDoc(volunteersCollection, vol);
  }
}
