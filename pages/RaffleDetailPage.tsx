import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Raffle, Ticket } from '../types';
import { storage } from '../lib/storage';
import Button from '../components/Button';
import { TicketIcon, CopyIcon, ShareIcon } from '../components/icons';
import { formatPhoneNumber, validatePhoneNumber } from '../lib/utils';

const RaffleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerPhoneError, setBuyerPhoneError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareCopySuccess, setShareCopySuccess] = useState(false);

  useEffect(() => {
    if (id) {
      setRaffle(storage.raffles.getById(id) || null);
    }
  }, [id]);

  const handleTicketSelect = (ticket: Ticket) => {
    if (ticket.status === 'available') {
      setSelectedNumbers(prev => 
        prev.includes(ticket.number)
          ? prev.filter(n => n !== ticket.number)
          : [...prev, ticket.number]
      );
    }
  };

  const handleBuyerPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      setBuyerPhone(formatted);
      if (e.target.value.length > 0 && !validatePhoneNumber(formatted)) {
          setBuyerPhoneError('preencha o telefone corretamente');
      } else {
          setBuyerPhoneError('');
      }
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const isPhoneValid = validatePhoneNumber(buyerPhone);
    if (!isPhoneValid) {
        setBuyerPhoneError('preencha o telefone corretamente');
    } else {
        setBuyerPhoneError('');
    }

    if (raffle && selectedNumbers.length > 0 && buyerName && isPhoneValid) {
      storage.raffles.reserveTickets(raffle.id, selectedNumbers, buyerName, buyerPhone);
      setRaffle(storage.raffles.getById(raffle.id) || null); // Refresh data
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
    }
  };
  
  const closeModal = () => {
      setIsModalOpen(false);
      // Don't clear selected numbers on cancel, user might just want to close the modal
      setBuyerName('');
      setBuyerPhone('');
      setBuyerPhoneError('');
  }

  const closeConfirmation = () => {
      setIsConfirmationOpen(false);
      setSelectedNumbers([]); // Clear selection after successful reservation
  }
  
  const handleCopyPixKey = () => {
    if (raffle?.pixKey) {
        navigator.clipboard.writeText(raffle.pixKey).then(() => {
            setCopySuccess(true);
            setTimeout(() => {
                setCopySuccess(false);
            }, 2000);
        });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        setShareCopySuccess(true);
        setTimeout(() => {
            setShareCopySuccess(false);
        }, 2000);
    });
  };

  if (!raffle) {
    return <div className="text-center p-10">Sorteio não encontrado...</div>;
  }

  if (raffle.status === 'awaiting_payment') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold">Sorteio Inativo</h1>
            <p className="text-gray-600 my-4 max-w-md">Este sorteio ainda está aguardando o pagamento da taxa de ativação pelo organizador.</p>
            <Link to={`/`}>
                <Button variant="secondary">Voltar para o Início</Button>
            </Link>
        </div>
    );
  }

  const getTicketClass = (ticket: Ticket) => {
    const isSelected = selectedNumbers.includes(ticket.number);
    if (isSelected) {
        return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer ring-2 ring-offset-2 ring-green-500';
    }
    switch (ticket.status) {
        case 'sold':
            return 'bg-gray-200 text-gray-500 cursor-not-allowed';
        case 'reserved':
            return 'bg-yellow-500 text-white cursor-not-allowed';
        case 'available':
            return 'bg-[#0054A6] hover:bg-[#004a94] text-white cursor-pointer';
    }
  };


  const soldTickets = raffle.tickets.filter(t => t.status === 'sold').length;
  const totalTickets = raffle.tickets.length;
  const progress = (soldTickets / totalTickets) * 100;
  const totalPrice = selectedNumbers.length * raffle.ticketPrice;

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white p-4 mb-8 border-b border-gray-200">
        <div className="container mx-auto">
            <Link to="/" className="text-[#0054A6] hover:text-[#004a94] font-semibold">&larr; Voltar para todos os sorteios</Link>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md">
                <h1 className="text-3xl font-bold mb-2">{raffle.name}</h1>
                <p className="text-gray-600 mb-6">{raffle.description}</p>
                <div className="mb-6">
                    <div className="flex justify-between items-center text-sm mb-1 text-gray-700">
                        <span>{soldTickets} / {totalTickets} confirmados</span>
                        <span className="font-bold">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-gradient-to-r from-[#0054A6] to-[#F26544] h-3 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-4 border-b border-gray-200 pb-2">Prêmios</h2>
                <div className="space-y-4">
                    {raffle.prizes.map((prize) => (
                        <div key={prize.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <img src={prize.photo || 'https://via.placeholder.com/100'} alt={prize.description} className="w-24 h-24 object-cover rounded-md" />
                            <p className="font-semibold">{prize.description}</p>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <div className="lg:col-span-1">
             <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md sticky top-8">
                <h2 className="text-xl font-bold mb-4">Informações</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Preço por Bilhete:</span>
                        <span className="font-bold text-lg text-[#0054A6]">R${raffle.ticketPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Data do Sorteio:</span>
                        <span className="font-semibold">{new Date(raffle.drawDate).toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-600">Responsável:</span>
                        <span className="font-semibold">{raffle.responsibleName}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-600">Contato:</span>
                        <span className="font-semibold">{raffle.responsiblePhone}</span>
                    </div>
                </div>
                <Button onClick={handleShare} variant="secondary" className="w-full mt-6">
                    <ShareIcon className="w-4 h-4 mr-2" />
                    {shareCopySuccess ? 'Link Copiado!' : 'Compartilhar Sorteio'}
                </Button>
             </div>
          </div>
        </div>
        
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-md">
            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center mb-4">
                <h2 className="text-2xl font-bold">Escolha seus números</h2>
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#0054A6]"></div> Disponível</span>
                    <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-yellow-500"></div> Reservado</span>
                    <span className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200"></div> Vendido</span>
                </div>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 gap-2">
                {raffle.tickets.map(ticket => (
                    <button 
                        key={ticket.number}
                        onClick={() => handleTicketSelect(ticket)}
                        disabled={ticket.status !== 'available'}
                        className={`p-2 rounded text-center font-bold text-sm transition ${getTicketClass(ticket)}`}
                        title={ticket.status === 'sold' ? 'Vendido' : ticket.status === 'reserved' ? 'Reservado - Aguardando Pagamento' :`Selecionar Bilhete ${String(ticket.number).padStart(3, '0')}`}
                    >
                        {String(ticket.number).padStart(3, '0')}
                    </button>
                ))}
            </div>
        </div>

        {selectedNumbers.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 p-4 z-40 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg">{selectedNumbers.length} número(s) selecionado(s)</p>
                        <p className="text-[#0054A6] text-xl font-bold">Total: R${totalPrice.toFixed(2)}</p>
                    </div>
                    <Button size="lg" onClick={() => setIsModalOpen(true)}>
                        Reservar Bilhetes
                    </Button>
                </div>
            </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg max-w-sm w-full border border-gray-200 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Reservar {selectedNumbers.length} Bilhete(s)</h2>
            <p className="mb-6 text-gray-600">Preencha seus dados para reservar. O pagamento deve ser feito via PIX.</p>
            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label htmlFor="buyerName" className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                <input type="text" id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required className="w-full bg-white border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label htmlFor="buyerPhone" className="block text-sm font-medium text-gray-700 mb-2">Telefone (WhatsApp)</label>
                <input type="text" id="buyerPhone" value={buyerPhone} onChange={handleBuyerPhoneChange} required className="w-full bg-white border border-gray-300 rounded-md px-3 py-2" />
                {buyerPhoneError && <p className="text-red-500 text-sm mt-1">{buyerPhoneError}</p>}
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button type="submit">Confirmar Reserva</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmationOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg max-w-md w-full border border-[#0054A6] text-center shadow-xl">
                <TicketIcon className="w-16 h-16 text-[#0054A6] mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Reserva Realizada!</h2>
                <p className="text-gray-700 mb-4">Seus números foram reservados. Para concluir, realize o pagamento e no fim, envie o comprovante para o responsável.</p>
                <div className="bg-gray-100 p-4 rounded-lg text-left">
                    <p className="text-sm text-gray-600">Tipo de chave: <span className="font-mono text-gray-800">{raffle.pixKeyType}</span></p>
                    <p className="text-sm text-gray-600 mt-2">Chave PIX:</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="font-mono bg-gray-200 p-2 rounded text-left text-[#0054A6] break-all flex-1">{raffle.pixKey}</p>
                        <Button variant="secondary" size="sm" onClick={handleCopyPixKey}>
                            <CopyIcon className="w-4 h-4 mr-2" />
                            {copySuccess ? 'Copiado!' : 'Copiar'}
                        </Button>
                    </div>
                </div>
                <Button onClick={closeConfirmation} className="mt-6">Fechar</Button>
            </div>
          </div>
      )}
    </div>
  );
};

export default RaffleDetailPage;