import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Raffle, Payment, PaymentProof } from '../types';
import { storage } from '../lib/storage';
import Button from '../components/Button';

interface PaymentWithDetails extends Payment {
    raffle?: Raffle;
    proof?: PaymentProof;
}

const PaymentValidationPage: React.FC = () => {
    const [pendingPayments, setPendingPayments] = useState<PaymentWithDetails[]>([]);
    const [processedPayments, setProcessedPayments] = useState<PaymentWithDetails[]>([]);
    const [notes, setNotes] = useState<{ [key: string]: string }>({});

    const loadPayments = () => {
        const allPayments = storage.payments.getAll();
        const allRaffles = storage.raffles.getAll();
        const allProofs = storage.proofs.getAll();

        const paymentsWithDetails = allPayments.map(p => ({
            ...p,
            raffle: allRaffles.find(r => r.id === p.raffleId),
            proof: allProofs.find(proof => proof.paymentId === p.id),
        }));
        
        setPendingPayments(paymentsWithDetails.filter(p => p.status === 'pending' && p.proof));
        setProcessedPayments(paymentsWithDetails.filter(p => p.status !== 'pending').sort((a,b) => (b.confirmedAt || b.createdAt).localeCompare(a.confirmedAt || a.createdAt)));
    };

    useEffect(() => {
        loadPayments();
    }, []);

    const handleConfirm = (paymentId: string) => {
        storage.payments.confirm(paymentId, notes[paymentId] || '');
        loadPayments(); // Refresh list
    };

    const handleReject = (paymentId: string) => {
        storage.payments.reject(paymentId, notes[paymentId] || '');
        loadPayments(); // Refresh list
    };
    
    const handleNoteChange = (paymentId: string, value: string) => {
        setNotes(prev => ({ ...prev, [paymentId]: value }));
    };

    return (
        <div className="min-h-screen pb-20">
            <header className="bg-white p-4 mb-8 border-b border-gray-200">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">Validação de Pagamentos</h1>
                    <Link to="/" className="text-sm text-gray-600 hover:text-[#002D5B]">Voltar ao Início</Link>
                </div>
            </header>
            
            <main className="container mx-auto px-4 space-y-12">
                <section>
                    <h2 className="text-2xl font-bold mb-4">Pagamentos Pendentes de Validação</h2>
                    {pendingPayments.length === 0 ? (
                        <p className="text-gray-500 bg-white p-6 rounded-lg border">Nenhum pagamento com comprovante para validar no momento.</p>
                    ) : (
                        <div className="space-y-6">
                            {pendingPayments.map(p => (
                                <div key={p.id} className="bg-white p-6 rounded-lg border border-yellow-300 shadow-md grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-bold text-lg">{p.raffle?.name || 'Sorteio não encontrado'}</h3>
                                        <p><strong>Referência:</strong> <span className="font-mono">{p.reference}</span></p>
                                        <p><strong>Valor:</strong> <span className="font-semibold text-green-700">R$ {p.amount.toFixed(2)}</span></p>
                                        <p><strong>Criador:</strong> {p.raffle?.responsibleName}</p>
                                        <p><strong>Contato:</strong> {p.raffle?.responsiblePhone}</p>
                                        <p><strong>Email Admin:</strong> {p.raffle?.adminEmail}</p>

                                        <div className="mt-4">
                                            <label htmlFor={`notes-${p.id}`} className="block text-sm font-medium text-gray-700 mb-1">Observações (Opcional)</label>
                                            <textarea id={`notes-${p.id}`} value={notes[p.id] || ''} onChange={(e) => handleNoteChange(p.id, e.target.value)} rows={2} className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition" />
                                        </div>

                                        <div className="flex gap-4 mt-4">
                                            <Button onClick={() => handleConfirm(p.id)} size="sm">✓ Confirmar</Button>
                                            <Button onClick={() => handleReject(p.id)} variant="secondary" size="sm">× Recusar</Button>
                                            <a href={`mailto:${p.raffle?.adminEmail}`}><Button variant="secondary" size="sm">Contactar Criador</Button></a>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Comprovante:</h4>
                                        {p.proof?.proofImage ? (
                                            <a href={p.proof.proofImage} target="_blank" rel="noopener noreferrer">
                                                <img src={p.proof.proofImage} alt="Comprovante" className="max-h-80 w-auto rounded-lg border p-1 cursor-pointer hover:ring-2 ring-[#0054A6]"/>
                                            </a>
                                        ) : (
                                            <p className="text-red-500">Comprovante não encontrado!</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                
                <section>
                    <h2 className="text-2xl font-bold mb-4">Pagamentos Processados</h2>
                     <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg bg-white">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3">Sorteio</th>
                                    <th className="p-3">Referência</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Observações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {processedPayments.map(p => (
                                    <tr key={p.id}>
                                        <td className="p-3 font-semibold">{p.raffle?.name}</td>
                                        <td className="p-3 font-mono">{p.reference}</td>
                                        <td className="p-3">
                                            {p.status === 'confirmed' && <span className="text-xs font-bold bg-green-100 text-green-800 py-1 px-2 rounded-full">Confirmado</span>}
                                            {p.status === 'rejected' && <span className="text-xs font-bold bg-red-100 text-red-800 py-1 px-2 rounded-full">Recusado</span>}
                                        </td>
                                        <td className="p-3">{new Date(p.confirmedAt || p.createdAt).toLocaleString()}</td>
                                        <td className="p-3">{p.notes}</td>
                                    </tr>
                                ))}
                                {processedPayments.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center p-6 text-gray-500">Nenhum pagamento processado.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default PaymentValidationPage;
