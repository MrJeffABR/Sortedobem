
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Raffle, Payment } from '../types';
import { storage } from '../lib/storage';
import { checkPaymentStatus, isAbacateDevMode } from '../lib/abacatepay-config';
import Button from '../components/Button';
import { CopyIcon } from '../components/icons';

// Placeholder for manual mode fallback
const PIX_QR_CODE_PLACEHOLDER = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; 

const PaymentPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [raffle, setRaffle] = useState<Raffle | null>(null);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (id) {
            const currentRaffle = storage.raffles.getById(id);
            if (currentRaffle) {
                setRaffle(currentRaffle);
                const currentPayment = storage.payments.getById(currentRaffle.paymentId!);
                setPayment(currentPayment || null);
            }
        }

        // Cleanup polling on unmount
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [id]);

    // Poll AbacatePay status if payment is pending and has an AbacatePay ID
    useEffect(() => {
        if (payment && payment.status === 'pending' && payment.abacatePayId) {
            
            const checkStatus = async () => {
                setIsChecking(true);
                const status = await checkPaymentStatus(payment.abacatePayId!);
                setIsChecking(false);

                if (status === 'PAID') {
                    // Update local state
                    storage.payments.confirm(payment.id, 'Pago via AbacatePay (Auto)');
                    
                    // Reload local state to reflect changes in UI
                    const updatedPayment = storage.payments.getById(payment.id);
                    setPayment(updatedPayment || null);
                    
                    if (pollInterval.current) clearInterval(pollInterval.current);
                }
            };

            // Check immediately then every 5 seconds
            checkStatus();
            pollInterval.current = setInterval(checkStatus, 5000);
        }
    }, [payment?.id, payment?.abacatePayId, payment?.status]);

    const handleCopyPixKey = () => {
        const keyToCopy = payment?.abacatePayPixCode || payment?.reference || "";
        navigator.clipboard.writeText(keyToCopy).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    if (!raffle || !payment) {
        return <div className="text-center p-10">Sorteio ou pagamento não encontrado...</div>;
    }

    const getStatusIndicator = () => {
        switch(payment.status) {
            case 'pending':
                return <span className="bg-yellow-100 text-yellow-800 font-bold py-1 px-3 rounded-full animate-pulse">🟠 Aguardando Pagamento...</span>;
            case 'confirmed':
                 return <span className="bg-green-100 text-green-800 font-bold py-1 px-3 rounded-full">✅ Pagamento Confirmado</span>;
            case 'rejected':
                 return <span className="bg-red-100 text-red-800 font-bold py-1 px-3 rounded-full">❌ Pagamento Recusado</span>;
        }
    };

    // Determine what QR code to show: AbacatePay dynamic code or manual fallback
    const qrValue = payment.abacatePayPixCode || payment.abacatePayUrl || "Manual Payment";
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl text-center">
                <h1 className="text-3xl font-bold text-[#002D5B]">Ativação do Sorteio</h1>
                <p className="text-gray-600 mt-2 mb-6">Realize o pagamento da taxa para que seu sorteio seja listado publicamente.</p>

                {isAbacateDevMode && payment.status === 'pending' && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 text-left rounded shadow-sm" role="alert">
                        <p className="font-bold flex items-center">
                            <span className="text-xl mr-2">🛠️</span> Modo de Desenvolvimento (Testnet)
                        </p>
                        <p className="text-sm mt-1">
                            Esta cobrança foi gerada usando uma chave de teste (<code>abc_dev_...</code>). 
                            O pagamento não debitará valores reais da sua conta, mas simulará o fluxo completo de aprovação.
                        </p>
                    </div>
                )}

                <div className="bg-white border border-gray-200 p-8 rounded-xl shadow-lg space-y-6">
                    <div>
                        <p className="text-gray-600">Sorteio:</p>
                        <h2 className="text-2xl font-semibold text-[#0054A6]">{raffle.name}</h2>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                         <p className="text-lg">Status:</p>
                         {getStatusIndicator()}
                    </div>

                    {payment.status === 'pending' && (
                      <>
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="text-center flex flex-col items-center justify-center">
                                <div className="border-4 border-[#0054A6] rounded-lg p-2 bg-white relative">
                                    {payment.abacatePayPixCode ? (
                                        <QRCode value={payment.abacatePayPixCode} size={160} />
                                    ) : (
                                        <img src={PIX_QR_CODE_PLACEHOLDER} alt="PIX QR Code" className="w-40 h-40 opacity-50" />
                                    )}
                                    {isAbacateDevMode && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                                            <span className="font-bold text-[#0054A6] rotate-[-15deg] border-2 border-[#0054A6] px-2 py-1 rounded">TEST MODE</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm mt-2 text-gray-500">Abra seu App do Banco e escaneie</p>
                            </div>
                            <div className="space-y-4">
                                <p className="text-lg">Ou use o Pix Copia e Cola:</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={payment.abacatePayPixCode || "Carregando código PIX..."} 
                                        className="font-mono bg-gray-100 p-3 rounded text-left text-sm text-[#002D5B] w-full border border-gray-300 focus:outline-none"
                                    />
                                    <Button variant="secondary" size="sm" onClick={handleCopyPixKey} disabled={!payment.abacatePayPixCode}>
                                        <CopyIcon className="w-4 h-4 mr-2" />
                                        {copySuccess ? 'Copiado!' : 'Copiar'}
                                    </Button>
                                </div>
                                <div className="text-left bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p>Valor a pagar: <span className="font-bold text-2xl text-green-700">R$ {payment.amount.toFixed(2)}</span></p>
                                    <p className="mt-1 text-sm text-green-800">Processado por <strong>AbacatePay</strong> 🥑</p>
                                </div>
                            </div>
                        </div>

                        {payment.abacatePayUrl && (
                            <div className="pt-4">
                                <a href={payment.abacatePayUrl} target="_blank" rel="noopener noreferrer">
                                    <Button size="lg" className="w-full md:w-auto">
                                        Abrir Link de Pagamento Seguro ↗
                                    </Button>
                                </a>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-6">
                            {isChecking && <p className="text-sm text-gray-400 animate-pulse mb-2">Verificando pagamento...</p>}
                            <p className="text-xs text-gray-500">
                                O sistema reconhecerá seu pagamento automaticamente em alguns instantes.
                            </p>
                        </div>
                      </>
                    )}

                    {payment.status === 'confirmed' && (
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200 animate-pulse">
                            <h3 className="text-xl font-bold text-green-800">Sorteio Ativado com Sucesso!</h3>
                            <p className="mt-2 text-gray-700">Seu pagamento foi confirmado automaticamente.</p>
                            <Link to={`/rifa/${raffle.id}`} className="mt-4 inline-block">
                                <Button>Acessar Página do Sorteio</Button>
                            </Link>
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <Link to="/"><Button variant="secondary">Voltar para o Início</Button></Link>
                </div>
            </div>
        </div>
    );
}

export default PaymentPage;
