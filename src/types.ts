import { Timestamp } from "firebase/firestore";

export interface Student {
  id: string;
  name: string;
  phone: string;
  class: string;
  batchName: string;
  monthlyFee: number;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  amount: number;
  date: Timestamp;
  receiptNumber: string;
  status: 'Paid';
}

export interface Settings {
  instituteName: string;
  logoUrl?: string;
  logoBase64?: string;
  signatureBase64?: string;
}

export interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
