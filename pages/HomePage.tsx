
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { PlusIcon, TicketIcon, HeartIcon } from '../components/icons';
import { storage } from '../lib/storage';
import { Raffle } from '../types';
import RaffleCard from '../components/RaffleCard';

const HomePage: React.FC = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);

  useEffect(() => {
    const loadedRaffles = storage.raffles.getAll();
    setRaffles(loadedRaffles);
  }, []);

  const activeRaffles = raffles.filter(r => r.status === 'active');


  const Header: React.FC = () => (
    <header className="bg-white/90 backdrop-blur sticky top-0 z-10 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
             <div className="w-12 h-12 bg-[#0054A6] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <HeartIcon className="w-7 h-7 text-[#F26544]" fill="#F26544" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#002D5B]">
                SORTE DO BEM
              </h1>
              <p className="text-sm text-gray-600">Crie e gerencie seus sorteios</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/admin/login">
              <Button variant="secondary">
                Admin
              </Button>
            </Link>
            <Link to="/criar-rifa">
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Novo Sorteio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );

  const Footer: React.FC = () => (
    <footer className="border-t border-gray-200 mt-20">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-500">
        <p>SORTE DO BEM - Sistema de Gestão de Sorteios © 2025</p>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {raffles.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 border border-gray-200 shadow-md">
              <TicketIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Nenhum sorteio criado ainda</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Comece criando seu primeiro sorteio! É rápido, fácil e intuitivo.
            </p>
            <Link to="/criar-rifa">
              <Button size="lg">
                <PlusIcon className="w-5 h-5 mr-2" />
                Criar Primeiro Sorteio
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Sorteios Disponíveis</h2>
              <p className="text-gray-600">
                Escolha um sorteio e garanta seus números da sorte!
              </p>
            </div>
            {activeRaffles.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeRaffles.map((raffle) => (
                    <RaffleCard
                      key={raffle.id}
                      raffle={raffle}
                    />
                  ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-lg border">
                    <p className="text-gray-600">Nenhum sorteio ativo no momento.</p>
                </div>
            )}
          </div>
        )}
      </main>

      <section className="container mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-md text-center max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-[#002D5B]">Como Funciona a Sorte do Bem</h2>
            <div className="text-gray-600 space-y-3 leading-relaxed">
                <p>
                    Este site foi criado para facilitar o gerenciamento de sorteios com finalidade solidária.
                </p>
                <p>
                    Para criar um sorteio, clique em <strong>“Novo Sorteio”</strong> e preencha as informações solicitadas. Cada sorteio possui um painel de controle exclusivo, acessível apenas pelo responsável.
                </p>
                <p>
                    No painel de controle, o responsável pode acompanhar todas as informações do seu sorteio e realizar o sorteio após a venda de todos os números.
                </p>
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 my-4 font-semibold text-center">
                    <p>
                        A liberação de cada sorteio requer o pagamento único de apenas R$ 20,00, valor destinado à manutenção e melhoria da plataforma.
                    </p>
                </div>
                <p>
                    Em caso de dúvidas ou sugestões, entre em contato pelo WhatsApp: <a href="https://wa.me/5566981040688" target="_blank" rel="noopener noreferrer" className="font-bold text-[#0054A6] hover:underline">(66) 98104-0688</a>.
                </p>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
