
import React from 'react';
import { Link } from 'react-router-dom';
import { Raffle } from '../types';
import Button from './Button';
import { TrophyIcon, LockIcon } from './icons';

interface RaffleCardProps {
  raffle: Raffle;
}

const RaffleCard: React.FC<RaffleCardProps> = ({ raffle }) => {
  const soldTickets = raffle.tickets.filter(t => t.status === 'sold').length;
  const totalTickets = raffle.tickets.length;
  const progress = (soldTickets / totalTickets) * 100;
  
  const isFinished = raffle.status === 'finished';
  const isAwaitingPayment = raffle.status === 'awaiting_payment';
  
  const linkTo = isAwaitingPayment ? `/rifa/${raffle.id}/pagamento` : `/rifa/${raffle.id}`;
  const buttonText = isAwaitingPayment ? 'Realizar Pagamento' : 'Ver Detalhes';

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md ${isFinished ? 'hover:border-orange-300' : isAwaitingPayment ? 'hover:border-yellow-400' : 'hover:border-[#0054A6]'} transition-all duration-300 flex flex-col`}>
      <div className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold mb-2 text-[#002D5B] flex-1 pr-2">{raffle.name}</h3>
            <Link to={`/rifa/${raffle.id}/admin`} title="Painel do Administrador">
                <Button variant="secondary" size="sm" className="!p-2">
                    <LockIcon className="w-4 h-4" />
                </Button>
            </Link>
        </div>
        
        {isAwaitingPayment && (
          <div className="my-2">
              <p className="text-xs font-bold bg-yellow-100 text-yellow-800 py-1 px-2 rounded-full inline-block">🟠 AGUARDANDO PAGAMENTO</p>
          </div>
        )}

        {isFinished ? (
          <div className="text-center my-6 py-4 bg-orange-50 rounded-lg border border-orange-200">
            <TrophyIcon className="w-10 h-10 mx-auto text-[#F26544] mb-3" />
            <p className="text-sm text-gray-600">Bilhete Vencedor:</p>
            <p className="text-3xl font-bold text-[#F26544] my-1">#{String(raffle.winnerTicketNumber).padStart(4, '0')}</p>
            <p className="text-xs text-gray-500">
              Sorteado em: {new Date(raffle.drawCompletionDate!).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-4 h-12 overflow-hidden text-ellipsis">{raffle.description}</p>
            
            <div className="my-4">
                <div className="flex justify-between items-center text-sm mb-1 text-gray-700">
                    <span>Progresso</span>
                    <span>{soldTickets} / {totalTickets}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                        className="bg-gradient-to-r from-[#0054A6] to-[#F26544] h-2.5 rounded-full" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
          </>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-500 mt-auto pt-4">
          <span>Sorteio em: {new Date(raffle.drawDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-2xl font-bold bg-gradient-to-r from-[#0054A6] to-[#F26544] bg-clip-text text-transparent">
            R${raffle.ticketPrice.toFixed(2)}
          </p>
          <Link to={linkTo}>
            <Button size="md">{buttonText}</Button>
          </Link>
      </div>
    </div>
  );
};

export default RaffleCard;