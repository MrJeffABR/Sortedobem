
export interface Prize {
  id: string;
  description: string;
  photo: string; // base64 string
}

export interface Ticket {
  number: number;
  buyerName?: string;
  buyerPhone?: string;
  status: 'available' | 'reserved' | 'sold';
}

export interface Payment {
  id: string;
  raffleId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  reference: string;
  createdAt: string; // ISO date string
  confirmedAt?: string; // ISO date string
  notes?: string;
  
  // AbacatePay fields
  abacatePayId?: string;
  abacatePayUrl?: string;
  abacatePayPixCode?: string; // The copy-paste code
}

export interface PaymentProof {
  paymentId: string;
  proofImage: string; // base64 string
}


export interface Raffle {
  id: string;
  name: string;
  description: string;
  ticketPrice: number;
  
  // New fields
  pixKeyType: 'email' | 'phone' | 'cpf' | 'random';
  pixKey: string;
  responsibleName: string;
  responsiblePhone: string;
  adminEmail: string;
  adminPassword: string;
  prizes: Prize[];
  tickets: Ticket[];

  createdAt: string; // ISO date string
  drawDate: string; // ISO date string for planned draw

  winnerTicketNumber?: number;
  drawCompletionDate?: string; // ISO date string for when draw actually happened

  // Monetization fields
  status: 'draft' | 'awaiting_payment' | 'active' | 'finished';
  paymentId?: string;
}