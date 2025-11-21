import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Raffle } from '../types';
import { storage } from '../lib/storage';
import Button from '../components/Button';
import { TrophyIcon, DownloadIcon, LockIcon, CheckIcon } from '../components/icons';

const Confetti: React.FC = () => {
    const colors = ["#F26544", "#0054A6", "#f2c644", "#4CAF50", "#2196F3"];
    // Increased number of confetti for a more celebratory effect
    const confettiPieces = Array.from({ length: 150 }).map((_, i) => {
        const style: React.CSSProperties = {
            left: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            // Randomized duration and delay for a more natural feel
            animation: `fall ${3 + Math.random() * 2}s linear ${Math.random() * 2}s forwards`,
            width: `${Math.floor(Math.random() * 6) + 8}px`,
            height: `${Math.floor(Math.random() * 4) + 6}px`,
            transform: `rotate(${Math.random() * 360}deg)`,
        };
        return <div key={i} className="confetti" style={style}></div>;
    });
    return <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">{confettiPieces}</div>;
};

const DrawingSpinner: React.FC<{ tickets: { number: number }[] }> = ({ tickets }) => {
    const ticketReel = useMemo(() => {
        if (!tickets || tickets.length === 0) return [];
        // Repeat the list to make it long enough for a smooth visual loop
        return [...tickets, ...tickets, ...tickets];
    }, [tickets]);

    if (ticketReel.length === 0) return null;

    // The animation will loop over a single, original-sized block of tickets.
    const loopHeight = tickets.length * 48; // 48px = 3rem (h-12 in Tailwind)
    // Adjust animation speed based on number of tickets for a better feel
    const loopDuration = Math.max(0.5, tickets.length * 0.02);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 drawing-spinner-overlay">
            <div className="text-center text-white drawing-spinner-content">
                <h2 className="text-3xl font-bold mb-6">Sorteando o vencedor...</h2>
                <div className="relative w-48 h-32 bg-gray-900 rounded-lg overflow-hidden border-2 border-[#F26544] mx-auto spinner-window">
                    <div className="absolute top-1/2 left-0 w-full h-12 bg-[#F26544]/30 transform -translate-y-1/2 z-10 border-y-2 border-[#F26544] spinner-pointer"></div>
                    {/* FIX: Cast style object to React.CSSProperties to allow for CSS custom properties. */}
                    <div className="absolute top-0 left-0 w-full spinner-numbers-reel" style={{ '--loop-height': `-${loopHeight}px`, '--loop-duration': `${loopDuration}s` } as React.CSSProperties}>
                        {ticketReel.map((ticket, index) => (
                            <div key={index} className="h-12 flex items-center justify-center text-3xl font-bold">
                                #{String(ticket.number).padStart(3, '0')}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const RaffleAdminPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [raffle, setRaffle] = useState<Raffle | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);
    const [drawnWinner, setDrawnWinner] = useState<{ number: number; buyerName?: string } | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (id) {
            setRaffle(storage.raffles.getById(id) || null);
        }
    }, [id]);

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (id && storage.raffles.checkCredentials(id, email, password)) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('E-mail ou senha incorretos.');
        }
    };
    
    const updateRaffle = () => {
        if (id) {
            setRaffle(storage.raffles.getById(id));
        }
    }

    const handleConfirmPayment = (ticketNumber: number) => {
        if (raffle) {
            storage.raffles.confirmPayment(raffle.id, ticketNumber);
            updateRaffle();
        }
    };

    const soldTickets = raffle ? raffle.tickets.filter(t => t.status === 'sold') : [];
    const canDraw = soldTickets.length > 0 && soldTickets.length === raffle.tickets.length;

    const winnerTicket = raffle && raffle.winnerTicketNumber
    ? raffle.tickets.find(t => t.number === raffle.winnerTicketNumber)
    : null;


    const handleDrawWinner = () => {
        if (raffle && !raffle.winnerTicketNumber && canDraw) {
            setIsDrawing(true);
            setTimeout(() => {
                const updatedRaffle = storage.raffles.drawWinner(raffle.id);
                if (updatedRaffle && updatedRaffle.winnerTicketNumber) {
                    setRaffle(updatedRaffle); // Update state immediately
                    const winnerInfo = updatedRaffle.tickets.find(t => t.number === updatedRaffle.winnerTicketNumber);
                    if (winnerInfo) {
                        setDrawnWinner({ number: winnerInfo.number, buyerName: winnerInfo.buyerName });
                        setIsWinnerModalOpen(true);
                    }
                }
                setIsDrawing(false);
            }, 5000); // 5 second animation
        }
    };
    
    const exportToCSV = () => {
        if (!raffle) return;
        const ticketsToExport = raffle.tickets.filter(t => t.status === 'sold' || t.status === 'reserved');
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Numero,Nome,Telefone,Status\n";
        ticketsToExport.forEach(ticket => {
            const name = ticket.buyerName || '';
            const phone = ticket.buyerPhone || '';
            const status = ticket.status === 'sold' ? 'Confirmado' : 'Reservado';
            csvContent += `${ticket.number},"${name.replace(/"/g, '""')}","${phone.replace(/"/g, '""')}","${status}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `compradores_${raffle.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!raffle) {
        return <div className="text-center p-10">Sorteio não encontrado...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="text-center mb-6">
                        <LockIcon className="w-12 h-12 mx-auto text-[#0054A6]" />
                        <h1 className="text-2xl font-bold mt-4">Painel do Administrador</h1>
                        <p className="text-gray-600">Acesso restrito para o sorteio "{raffle.name}"</p>
                    </div>
                    <form onSubmit={handleAuth} className="bg-white p-8 rounded-lg border border-gray-200 shadow-md space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-mail de Acesso</label>
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white border border-gray-300 rounded-md px-3 py-2" />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Senha de Acesso</label>
                            <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white border border-gray-300 rounded-md px-3 py-2" />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex gap-4 justify-end pt-2">
                           <Button type="submit">Entrar</Button>
                           <Link to="/"><Button variant="secondary" type="button">Voltar</Button></Link>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    
    const reservedTickets = raffle.tickets.filter(t => t.status === 'reserved');
    const buyers = [...reservedTickets, ...soldTickets];
    
    const getDrawButtonText = () => {
        if (isDrawing) return "Sorteando...";
        if (raffle.winnerTicketNumber) return "Sorteio Realizado";
        if (canDraw) return "Realizar Sorteio Agora";
        return "Aguardando Venda Total";
    };

    return (
        <div className="min-h-screen pb-20">
            {isDrawing && <DrawingSpinner tickets={soldTickets} />}
            <header className="bg-white p-4 mb-8 border-b border-gray-200">
              <div className="container mx-auto flex justify-between items-center">
                  <h1 className="text-xl font-bold">Admin: <span className="text-[#0054A6]">{raffle.name}</span></h1>
                  <Link to="/" className="text-sm text-gray-600 hover:text-[#002D5B]">Sair do Painel</Link>
              </div>
            </header>
            
            <main className="container mx-auto px-4 space-y-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
                        <h3 className="text-gray-600 text-sm">Pagamentos Pendentes</h3>
                        <p className="text-3xl font-bold text-yellow-500">{reservedTickets.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
                        <h3 className="text-gray-600 text-sm">Bilhetes Confirmados</h3>
                        <p className="text-3xl font-bold">{soldTickets.length} / {raffle.tickets.length}</p>
                    </div>
                     <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
                        <h3 className="text-gray-600 text-sm">Arrecadação Confirmada</h3>
                        <p className="text-3xl font-bold text-green-600">R${(soldTickets.length * raffle.ticketPrice).toFixed(2)}</p>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Realizar Sorteio</h2>
                    <p className="text-gray-600 mb-4">
                        {raffle.winnerTicketNumber 
                            ? 'O sorteio já foi concluído. Veja os detalhes do vencedor abaixo.'
                            : canDraw 
                                ? 'Todos os bilhetes foram vendidos! Clique no botão abaixo para iniciar o sorteio.'
                                : 'O sorteio só poderá ser realizado quando todos os bilhetes forem vendidos e confirmados.'
                        }
                    </p>
                    <div className="flex items-center flex-wrap gap-6">
                        <Button
                            onClick={handleDrawWinner}
                            disabled={!canDraw || !!raffle.winnerTicketNumber || isDrawing}
                            size="lg"
                            className={canDraw && !raffle.winnerTicketNumber ? 'btn-pulse-glow' : ''}
                        >
                            <TrophyIcon className="w-5 h-5 mr-2" />
                            {getDrawButtonText()}
                        </Button>

                        {winnerTicket && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <p className="text-sm text-green-800 font-semibold">Vencedor:</p>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-2xl font-bold text-[#002D5B]">{winnerTicket.buyerName}</p>
                                    <p className="text-gray-600">Bilhete: <span className="font-mono text-lg font-bold text-[#0054A6]">#{String(winnerTicket.number).padStart(3, '0')}</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Compradores ({buyers.length})</h2>
                        <Button variant="secondary" onClick={exportToCSV} disabled={buyers.length === 0}>
                           <DownloadIcon className="w-4 h-4 mr-2" /> Exportar CSV
                        </Button>
                    </div>
                    <div className="overflow-x-auto max-h-96 border border-gray-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3">Número</th>
                                    <th className="p-3">Nome</th>
                                    <th className="p-3">Telefone</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {buyers.map(ticket => (
                                    <tr key={ticket.number} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono bg-gray-50">#{String(ticket.number).padStart(3, '0')}</td>
                                        <td className="p-3">{ticket.buyerName}</td>
                                        <td className="p-3">{ticket.buyerPhone}</td>
                                        <td className="p-3">
                                            {ticket.status === 'sold' && <span className="text-xs font-bold bg-green-100 text-green-800 py-1 px-2 rounded-full">Confirmado</span>}
                                            {ticket.status === 'reserved' && <span className="text-xs font-bold bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full">Reservado</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            {ticket.status === 'reserved' && (
                                                <Button variant="secondary" size="sm" onClick={() => handleConfirmPayment(ticket.number)}>
                                                    <CheckIcon className="w-4 h-4 mr-1" />
                                                    Confirmar
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {buyers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center p-6 text-gray-500">Nenhum bilhete reservado ou vendido ainda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {isWinnerModalOpen && drawnWinner && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 modal-overlay">
                    <div className="relative bg-white p-8 rounded-lg max-w-md w-full text-center shadow-2xl modal-content border-4 border-[#F26544] overflow-hidden">
                        <Confetti />
                        <TrophyIcon className="w-20 h-20 text-yellow-400 mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }} />
                        <h2 className="text-3xl font-bold mb-2 text-[#002D5B]">Temos um Vencedor!</h2>
                        <p className="text-gray-600 mb-6">Parabéns ao sortudo!</p>
                        
                        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                            <p className="text-lg text-gray-700">Nome:</p>
                            <p className="text-4xl font-extrabold text-[#0054A6] my-1 break-words">{drawnWinner.buyerName || 'Nome não informado'}</p>
                            <p className="text-lg text-gray-700 mt-4">Número Sorteado:</p>
                            <p className="font-mono text-5xl font-extrabold text-[#F26544]">
                                #{String(drawnWinner.number).padStart(3, '0')}
                            </p>
                        </div>
                        
                        <Button onClick={() => setIsWinnerModalOpen(false)} className="mt-8" size="lg">
                            Fechar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RaffleAdminPage;