
import { Raffle, Ticket, Payment, PaymentProof, Prize } from '../types';
import { security } from './security';

const RAFFLES_KEY = 'rifafacil_raffles';
const PAYMENTS_KEY = 'rifafacil_payments';
const PROOFS_KEY = 'rifafacil_payment_proofs';
const RAFFLE_FEE = 20.00;


const getInitialRaffles = (): Raffle[] => {
  const initialPayments: Payment[] = [
      { id: 'payment-1', raffleId: '1', amount: RAFFLE_FEE, status: 'confirmed', reference: 'SORTEIO-1', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), confirmedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'payment-2', raffleId: '2', amount: RAFFLE_FEE, status: 'confirmed', reference: 'SORTEIO-2', createdAt: new Date(Date.now() - 86400000 * 6).toISOString(), confirmedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];
  const raffles: Raffle[] = [
    {
      id: '1',
      name: 'Sorteio Tech Sorte do Bem',
      description: 'Ajude a nossa causa e concorra a prêmios incríveis de tecnologia, incluindo um notebook de última geração e um smartphone.',
      ticketPrice: 10,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      pixKeyType: 'email',
      pixKey: 'doacao@techcharity.org',
      responsibleName: 'Admin Tech',
      responsiblePhone: '(11) 99999-8888',
      adminEmail: 'admin@tech.com',
      adminPassword: 'admin',
      prizes: [
        { id: 'p1', description: 'Notebook Gamer Pro', photo: 'https://via.placeholder.com/400x300.png/002D5B/FFFFFF?text=Notebook' },
        { id: 'p2', description: 'Smartphone XPTO 5G', photo: 'https://via.placeholder.com/400x300.png/002D5B/FFFFFF?text=Smartphone' }
      ],
      drawDate: new Date('2025-11-22T00:00:00.000Z').toISOString(),
      tickets: Array.from({ length: 50 }, (_, i) => {
        let status: 'available' | 'reserved' | 'sold' = 'available';
        if (i < 20) status = 'sold';
        else if (i < 25) status = 'reserved';
        return {
          number: i + 1,
          status,
          buyerName: status !== 'available' ? `Comprador ${i + 1}` : undefined,
          buyerPhone: status !== 'available' ? `(11) 91234-56${i.toString().padStart(2, '0')}`: undefined,
        }
      }),
      status: 'active',
      paymentId: 'payment-1',
    },
    {
      id: '2',
      name: 'Cesta Gourmet Sorte do Bem',
      description: 'Uma cesta recheada com os melhores produtos artesanais da região. Vinhos, queijos, e muito mais!',
      ticketPrice: 5,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      pixKeyType: 'phone',
      pixKey: '(48) 98877-6655',
      responsibleName: 'Sra. Gourmet',
      responsiblePhone: '(48) 98877-6655',
      adminEmail: 'admin@gourmet.com',
      adminPassword: 'admin',
      prizes: [
        { id: 'p1', description: 'Cesta de Produtos Regionais', photo: 'https://via.placeholder.com/400x300.png/002D5B/FFFFFF?text=Cesta+Gourmet' }
      ],
      drawDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      tickets: Array.from({ length: 100 }, (_, i) => ({
        number: i + 1,
        status: 'sold', // Sold out
        buyerName: `Cliente ${i + 1}`,
        buyerPhone: `(48) 98765-43${i.toString().padStart(2, '0')}`
      })),
      status: 'finished',
      winnerTicketNumber: 27,
      drawCompletionDate: new Date(Date.now() - 86400000).toISOString(),
      paymentId: 'payment-2',
    },
    {
      id: '3',
      name: 'Rifa de Rascunho',
      description: 'Um exemplo de rifa que ainda está em modo rascunho e não foi para pagamento.',
      ticketPrice: 2,
      createdAt: new Date().toISOString(),
      pixKeyType: 'random',
      pixKey: 'nao-definida',
      responsibleName: 'Admin Rascunho',
      responsiblePhone: '(00) 00000-0000',
      adminEmail: 'admin@rascunho.com',
      adminPassword: 'admin',
      prizes: [{ id: 'p1', description: 'Prêmio surpresa', photo: '' }],
      drawDate: new Date('2025-12-12T00:00:00.000Z').toISOString(),
      tickets: Array.from({ length: 50 }, (_, i) => ({
        number: i + 1,
        status: 'available',
      })),
      status: 'draft',
    }
  ];
  try {
    const existingRaffles = localStorage.getItem(RAFFLES_KEY);
    if (!existingRaffles || JSON.parse(existingRaffles).length === 0) {
        localStorage.setItem(RAFFLES_KEY, JSON.stringify(raffles));
        localStorage.setItem(PAYMENTS_KEY, JSON.stringify(initialPayments));
    }
  } catch (error) {
    console.error("Failed to set initial data in localStorage", error);
  }
  return raffles;
};

const getAll = (): Raffle[] => {
  try {
    const rafflesJson = localStorage.getItem(RAFFLES_KEY);
    if (!rafflesJson) {
      const initial = getInitialRaffles();
      saveAll(initial);
      return initial;
    }
    const raffles: Raffle[] = JSON.parse(rafflesJson);
    return raffles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Failed to get raffles from localStorage", error);
    return [];
  }
};

const getById = (id: string): Raffle | undefined => {
    return getAll().find(r => r.id === id);
}

const saveAll = (raffles: Raffle[]): void => {
    try {
        localStorage.setItem(RAFFLES_KEY, JSON.stringify(raffles));
    } catch (error) {
        console.error("Failed to save all raffles to localStorage", error);
    }
}

const save = (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'tickets' | 'status' | 'paymentId'> & {totalTickets: number}): Raffle => {
  const raffles = getAll();
  const payments = paymentsDb.getAll();
  
  const tickets = Array.from({ length: raffleData.totalTickets }, (_, i) => ({
    number: i + 1,
    status: 'available' as 'available',
  }));

  const newRaffleId = Date.now().toString();

  const newPayment: Payment = {
    id: `payment-${newRaffleId}`,
    raffleId: newRaffleId,
    amount: RAFFLE_FEE,
    status: 'pending',
    reference: `SORTEIO-${newRaffleId}`,
    createdAt: new Date().toISOString(),
  };

  // SANITIZATION: Clean inputs before saving to LocalStorage to prevent XSS when retrieving
  const sanitizedData = security.prepareForDatabase(raffleData);

  const newRaffle: Raffle = {
    ...sanitizedData,
    id: newRaffleId,
    createdAt: new Date().toISOString(),
    tickets,
    status: 'awaiting_payment',
    paymentId: newPayment.id,
  };
  
  const updatedRaffles = [newRaffle, ...raffles];
  saveAll(updatedRaffles);
  paymentsDb.saveAll([newPayment, ...payments]);

  return newRaffle;
};

const reserveTickets = (raffleId: string, ticketNumbers: number[], buyerName: string, buyerPhone: string): Raffle | undefined => {
  const raffles = getAll();
  const raffleIndex = raffles.findIndex(r => r.id === raffleId);

  if (raffleIndex > -1) {
    const raffle = raffles[raffleIndex];
    let allTicketsAvailable = true;

    ticketNumbers.forEach(ticketNumber => {
      const ticket = raffle.tickets.find(t => t.number === ticketNumber);
      if (!ticket || ticket.status !== 'available') {
        allTicketsAvailable = false;
      }
    });

    if (allTicketsAvailable) {
      // SANITIZATION: Clean buyer data
      const safeName = security.sanitize(buyerName);
      const safePhone = security.sanitize(buyerPhone);

      ticketNumbers.forEach(ticketNumber => {
        const ticketIndex = raffle.tickets.findIndex(t => t.number === ticketNumber);
        if (ticketIndex > -1) {
          raffle.tickets[ticketIndex] = {
            ...raffle.tickets[ticketIndex],
            status: 'reserved',
            buyerName: safeName,
            buyerPhone: safePhone
          };
        }
      });
      saveAll(raffles);
      return raffle;
    }
  }
  return undefined;
};

const confirmPayment = (raffleId: string, ticketNumber: number): Raffle | undefined => {
  const raffles = getAll();
  const raffleIndex = raffles.findIndex(r => r.id === raffleId);
  if (raffleIndex > -1) {
    const raffle = raffles[raffleIndex];
    const ticketIndex = raffle.tickets.findIndex(t => t.number === ticketNumber && t.status === 'reserved');

    if (ticketIndex > -1) {
      raffle.tickets[ticketIndex].status = 'sold';
      saveAll(raffles);
      return raffle;
    }
  }
  return undefined;
};

const checkCredentials = (raffleId: string, email: string, password: string): boolean => {
  const raffle = getById(raffleId);
  // Simple equality check is safe here as long as stored data was sanitized
  return !!raffle && raffle.adminEmail === email && raffle.adminPassword === password;
};

const drawWinner = (raffleId: string): Raffle | undefined => {
  const raffles = getAll();
  const raffleIndex = raffles.findIndex(r => r.id === raffleId);

  if (raffleIndex > -1) {
    const raffle = raffles[raffleIndex];
    const soldTickets = raffle.tickets.filter(t => t.status === 'sold');
    
    // A winner can be drawn if there is at least one sold ticket and there isn't a winner already.
    if (soldTickets.length > 0 && !raffle.winnerTicketNumber) {
      const winnerIndex = Math.floor(Math.random() * soldTickets.length);
      const winnerTicket = soldTickets[winnerIndex];
      raffle.winnerTicketNumber = winnerTicket.number;
      raffle.drawCompletionDate = new Date().toISOString();
      raffle.status = 'finished'; // Update status on draw
      saveAll(raffles);
      return raffle;
    }
  }
  return undefined;
};

// New function to update raffle details from the site admin panel
const updateDetails = (raffleId: string, data: Partial<Pick<Raffle, 'name' | 'description' | 'drawDate' | 'ticketPrice' | 'responsibleName' | 'responsiblePhone' | 'pixKeyType' | 'pixKey' | 'adminEmail' | 'adminPassword' | 'prizes'>>): Raffle | undefined => {
    const raffles = getAll();
    const raffleIndex = raffles.findIndex(r => r.id === raffleId);
    if (raffleIndex > -1) {
        const currentRaffle = raffles[raffleIndex];
        
        // SANITIZATION: Clean update data
        const safeData = security.prepareForDatabase(data);
        const updatedRaffle = { ...currentRaffle, ...safeData };

        if (data.ticketPrice) {
            updatedRaffle.ticketPrice = Number(data.ticketPrice);
        }

        raffles[raffleIndex] = updatedRaffle;
        saveAll(raffles);
        return raffles[raffleIndex];
    }
    return undefined;
}

// Site Admin Auth
const checkSiteAdminCredentials = (email: string, password: string): boolean => {
  return email === 'teste@gmail.com' && password === '123456';
};

const deleteRaffle = (raffleId: string): void => {
    const raffles = getAll();
    const payments = paymentsDb.getAll();
    const proofs = proofsDb.getAll();

    const raffleToDelete = raffles.find(r => r.id === raffleId);
    if (!raffleToDelete) return;

    // Filter out the raffle, its payment, and its proof
    const updatedRaffles = raffles.filter(r => r.id !== raffleId);
    saveAll(updatedRaffles);

    if (raffleToDelete.paymentId) {
        const updatedPayments = payments.filter(p => p.id !== raffleToDelete.paymentId);
        paymentsDb.saveAll(updatedPayments);
        const updatedProofs = proofs.filter(p => p.paymentId !== raffleToDelete.paymentId);
        proofsDb.saveAll(updatedProofs);
    }
};


// Payments DB
const paymentsDb = {
    getAll: (): Payment[] => {
        try {
            const data = localStorage.getItem(PAYMENTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Failed to get payments", error);
            return [];
        }
    },
    getById: (id: string): Payment | undefined => {
        return paymentsDb.getAll().find(p => p.id === id);
    },
    saveAll: (payments: Payment[]) => {
        localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
    },
    confirm: (paymentId: string, notes?: string): Payment | undefined => {
        const payments = paymentsDb.getAll();
        const paymentIndex = payments.findIndex(p => p.id === paymentId);
        if (paymentIndex > -1) {
            const payment = payments[paymentIndex];
            payment.status = 'confirmed';
            payment.confirmedAt = new Date().toISOString();
            payment.notes = notes ? security.sanitize(notes) : undefined; // Sanitize notes
            paymentsDb.saveAll(payments);

            // Also update the raffle status
            const raffles = getAll();
            const raffleIndex = raffles.findIndex(r => r.id === payment.raffleId);
            if(raffleIndex > -1) {
                raffles[raffleIndex].status = 'active';
                saveAll(raffles);
            }
            return payment;
        }
        return undefined;
    },
    reject: (paymentId: string, notes?: string): Payment | undefined => {
        const payments = paymentsDb.getAll();
        const paymentIndex = payments.findIndex(p => p.id === paymentId);
        if (paymentIndex > -1) {
            payments[paymentIndex].status = 'rejected';
            payments[paymentIndex].notes = notes ? security.sanitize(notes) : undefined; // Sanitize notes
            paymentsDb.saveAll(payments);
            return payments[paymentIndex];
        }
        return undefined;
    }
}

// Payment Proofs DB
const proofsDb = {
    getAll: (): PaymentProof[] => {
        try {
            const data = localStorage.getItem(PROOFS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Failed to get proofs", error);
            return [];
        }
    },
    saveAll: (proofs: PaymentProof[]) => {
        localStorage.setItem(PROOFS_KEY, JSON.stringify(proofs));
    },
    save: (proof: PaymentProof) => {
        const proofs = proofsDb.getAll().filter(p => p.paymentId !== proof.paymentId);
        proofs.push(proof);
        proofsDb.saveAll(proofs);
    },
    getForPayment: (paymentId: string): PaymentProof | undefined => {
        return proofsDb.getAll().find(p => p.paymentId === paymentId);
    }
}

export const storage = {
  raffles: {
    getAll,
    getById,
    save,
    reserveTickets,
    confirmPayment,
    checkCredentials,
    drawWinner,
    updateDetails,
    checkSiteAdminCredentials,
    deleteRaffle,
  },
  payments: paymentsDb,
  proofs: proofsDb,
};
