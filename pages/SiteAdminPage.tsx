import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storage } from '../lib/storage';
import { Raffle, Prize } from '../types';
import Button from '../components/Button';
import { TrashIcon, HeartIcon, UploadIcon, PlusIcon } from '../components/icons';
import { formatPhoneNumber, validatePhoneNumber } from '../lib/utils';

type RaffleStatus = Raffle['status'];
type FilterType = RaffleStatus | 'all';


const statusConfig: Record<RaffleStatus, { text: string; colorClasses: string; icon: string }> = {
    draft: { text: 'Rascunho', colorClasses: 'bg-gray-100 text-gray-800', icon: '📝' },
    awaiting_payment: { text: 'Pag. Pendente', colorClasses: 'bg-yellow-100 text-yellow-800', icon: '🟠' },
    active: { text: 'Ativo', colorClasses: 'bg-green-100 text-green-800', icon: '🟢' },
    finished: { text: 'Finalizado', colorClasses: 'bg-red-100 text-red-800', icon: '🔴' }
};

const StatusBadge: React.FC<{ status: RaffleStatus }> = ({ status }) => {
    const config = statusConfig[status];
    if (!config) return null;

    return (
        <span className={`px-2 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1.5 ${config.colorClasses}`}>
            {config.icon}
            {config.text}
        </span>
    );
};

const InputField: React.FC<{ label: string; id: string; type: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; required?: boolean; isTextArea?: boolean; children?: React.ReactNode }> = ({ label, id, type, value, onChange, required = false, isTextArea = false, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    {isTextArea ? (
      <textarea id={id} value={value} onChange={onChange} required={required} rows={3} className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition" />
    ) : children ? (
       <select id={id} value={value} onChange={onChange} required={required} className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition">
          {children}
       </select>
    ) : (
      <input type={type} id={id} value={value} onChange={onChange} required={required} className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition" />
    )}
  </div>
);

const EditRaffleModal: React.FC<{
    raffle: Raffle;
    onClose: () => void;
    onSave: (raffleId: string, data: Partial<Pick<Raffle, 'name' | 'description' | 'drawDate' | 'ticketPrice' | 'responsibleName' | 'responsiblePhone' | 'pixKeyType' | 'pixKey' | 'adminEmail' | 'adminPassword' | 'prizes'>>) => void;
}> = ({ raffle, onClose, onSave }) => {
    const [name, setName] = useState(raffle.name);
    const [description, setDescription] = useState(raffle.description);
    const [drawDate, setDrawDate] = useState(raffle.drawDate.substring(0, 10)); // Format for <input type="date">
    const [ticketPrice, setTicketPrice] = useState(String(raffle.ticketPrice));
    const [responsibleName, setResponsibleName] = useState(raffle.responsibleName);
    const [responsiblePhone, setResponsiblePhone] = useState(raffle.responsiblePhone);
    const [responsiblePhoneError, setResponsiblePhoneError] = useState('');
    const [pixKeyType, setPixKeyType] = useState(raffle.pixKeyType);
    const [pixKey, setPixKey] = useState(raffle.pixKey);
    const [adminEmail, setAdminEmail] = useState(raffle.adminEmail);
    const [adminPassword, setAdminPassword] = useState(raffle.adminPassword);
    const [prizes, setPrizes] = useState<Prize[]>(raffle.prizes);

    const handlePrizeChange = (index: number, field: 'description' | 'photo', value: string) => {
        const newPrizes = [...prizes];
        newPrizes[index] = { ...newPrizes[index], [field]: value };
        setPrizes(newPrizes);
    };

    const handlePhotoUpload = (index: number, file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handlePrizeChange(index, 'photo', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addPrize = () => {
        setPrizes([...prizes, { id: `new-prize-${Date.now()}`, description: '', photo: '' }]);
    };

    const removePrize = (index: number) => {
        if (prizes.length > 1) {
            const newPrizes = prizes.filter((_, i) => i !== index);
            setPrizes(newPrizes);
        }
    };
    
    const handleResponsiblePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setResponsiblePhone(formatted);
        if (e.target.value.length > 0 && !validatePhoneNumber(formatted)) {
            setResponsiblePhoneError('preencha o telefone corretamente');
        } else {
            setResponsiblePhoneError('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isPhoneValid = validatePhoneNumber(responsiblePhone);
        if (!isPhoneValid) {
            setResponsiblePhoneError('preencha o telefone corretamente');
            return;
        }

        onSave(raffle.id, {
            name,
            description,
            drawDate: new Date(drawDate).toISOString(),
            ticketPrice: parseFloat(ticketPrice),
            responsibleName,
            responsiblePhone,
            pixKeyType,
            pixKey,
            adminEmail,
            adminPassword,
            prizes,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg max-w-3xl w-full border border-gray-200 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Editar Sorteio</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset className="border border-gray-200 p-4 rounded-lg">
                        <legend className="px-2 text-[#0054A6] font-semibold">Informações do Sorteio</legend>
                        <div className="space-y-4">
                            <InputField label="Nome do Sorteio" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                            <InputField label="Descrição" id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} required isTextArea />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="Preço do Bilhete (R$)" id="ticketPrice" type="number" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} required />
                                <InputField label="Data do Sorteio" id="drawDate" type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} required />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border border-gray-200 p-4 rounded-lg">
                        <legend className="px-2 text-[#0054A6] font-semibold">Prêmios</legend>
                        <div className="space-y-4">
                            {prizes.map((prize, index) => (
                                <div key={prize.id} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="flex-grow">
                                        <InputField label={`Descrição do Prêmio ${index + 1}`} id={`prize_desc_${index}`} type="text" value={prize.description} onChange={(e) => handlePrizeChange(index, 'description', e.target.value)} required />
                                    </div>
                                    <div className="w-40 text-center">
                                        <label htmlFor={`prize_photo_${index}`} className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md inline-flex items-center text-sm">
                                            <UploadIcon className="w-4 h-4 mr-2" /> {prize.photo ? "Alterar Foto" : "Enviar Foto"}
                                        </label>
                                        <input id={`prize_photo_${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(index, e.target.files ? e.target.files[0] : null)} />
                                        {prize.photo && <img src={prize.photo} alt="Preview" className="mt-2 h-16 w-16 object-cover mx-auto rounded" />}
                                    </div>
                                    <Button type="button" variant="secondary" onClick={() => removePrize(index)} disabled={prizes.length === 1} className="!p-2 h-10">
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" onClick={addPrize}>
                                <PlusIcon className="w-4 h-4 mr-2" /> Adicionar Prêmio
                            </Button>
                        </div>
                    </fieldset>

                    <fieldset className="border border-gray-200 p-4 rounded-lg">
                        <legend className="px-2 text-[#0054A6] font-semibold">Responsável e Pagamento</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Nome do Responsável" id="responsibleName" type="text" value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} required />
                            <div>
                                <InputField label="Telefone do Responsável" id="responsiblePhone" type="text" value={responsiblePhone} onChange={handleResponsiblePhoneChange} required />
                                {responsiblePhoneError && <p className="text-red-500 text-sm mt-1">{responsiblePhoneError}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <InputField label="Tipo de Chave PIX" id="pixKeyType" type="select" value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value as any)} required>
                                <option value="random">Aleatória</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Celular</option>
                                <option value="cpf">CPF</option>
                            </InputField>
                            <InputField label="Chave PIX" id="pixKey" type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} required />
                        </div>
                    </fieldset>

                    <fieldset className="border border-gray-200 p-4 rounded-lg">
                        <legend className="px-2 text-[#0054A6] font-semibold">Acesso do Administrador</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="E-mail do Administrador" id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                            <InputField label="Senha do Administrador" id="adminPassword" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                        </div>
                    </fieldset>

                    <div className="flex items-center justify-end gap-4 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Salvar Alterações</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DeleteConfirmationModal: React.FC<{
    raffleName: string;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ raffleName, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white p-6 rounded-lg max-w-md w-full border border-gray-200 shadow-xl text-center">
                <h2 className="text-xl font-bold mb-4">Apagar Sorteio</h2>
                <p className="text-gray-600 mb-6">
                    Tem certeza que deseja apagar o sorteio "<strong>{raffleName}</strong>"? Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-center gap-4">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button className="bg-red-600 hover:bg-red-700 focus:ring-red-500" onClick={onConfirm}>Sim, Apagar</Button>
                </div>
            </div>
        </div>
    );
};

const PaymentConfirmationModal: React.FC<{
    raffleName: string;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ raffleName, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white p-6 rounded-lg max-w-md w-full border border-gray-200 shadow-xl text-center">
                <h2 className="text-xl font-bold mb-4">Confirmar Pagamento</h2>
                <p className="text-gray-600 mb-6">
                    O pagamento para o sorteio "<strong>{raffleName}</strong>" foi realizado?
                </p>
                <div className="flex justify-center gap-4">
                    <Button onClick={onConfirm}>Sim</Button>
                    <Button variant="secondary" onClick={onClose}>Não</Button>
                </div>
            </div>
        </div>
    );
};


const SiteAdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [allRaffles, setAllRaffles] = useState<Raffle[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    
    const [raffleToEdit, setRaffleToEdit] = useState<Raffle | null>(null);
    const [raffleToDelete, setRaffleToDelete] = useState<Raffle | null>(null);
    const [raffleToConfirmPayment, setRaffleToConfirmPayment] = useState<Raffle | null>(null);

    const loadRaffles = () => {
        setAllRaffles(storage.raffles.getAll());
    };
    
    useEffect(() => {
        if (sessionStorage.getItem('siteAdminAuthenticated') !== 'true') {
            navigate('/admin/login');
        }
        loadRaffles();
    }, [navigate]);

    const handleLogout = () => {
        sessionStorage.removeItem('siteAdminAuthenticated');
        navigate('/');
    };

    const handleSaveEdit = (raffleId: string, data: Partial<Pick<Raffle, 'name' | 'description' | 'drawDate' | 'ticketPrice' | 'responsibleName' | 'responsiblePhone' | 'pixKeyType' | 'pixKey' | 'adminEmail' | 'adminPassword' | 'prizes'>>) => {
        storage.raffles.updateDetails(raffleId, data);
        loadRaffles();
        setRaffleToEdit(null);
    };

    const handleConfirmDelete = () => {
        if (raffleToDelete) {
            storage.raffles.deleteRaffle(raffleToDelete.id);
            loadRaffles();
            setRaffleToDelete(null);
        }
    };

    const handleConfirmRafflePayment = () => {
        if (raffleToConfirmPayment && raffleToConfirmPayment.paymentId) {
            storage.payments.confirm(raffleToConfirmPayment.paymentId, 'Confirmado manualmente pelo admin.');
            loadRaffles();
            setRaffleToConfirmPayment(null);
        }
    };
    
    const counts = useMemo(() => {
        return allRaffles.reduce((acc, raffle) => {
            acc[raffle.status] = (acc[raffle.status] || 0) + 1;
            return acc;
        }, {} as Record<RaffleStatus, number>);
    }, [allRaffles]);

    const filteredRaffles = useMemo(() => {
        if (filter === 'all') return allRaffles;
        return allRaffles.filter(r => r.status === filter);
    }, [allRaffles, filter]);

    const filterOptions: { key: FilterType; label: string }[] = [
        { key: 'all', label: 'Todos' },
        { key: 'draft', label: 'Rascunhos' },
        { key: 'awaiting_payment', label: 'Pag. Pendente' },
        { key: 'active', label: 'Ativos' },
        { key: 'finished', label: 'Finalizados' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white p-4 shadow-sm border-b border-gray-200">
              <div className="container mx-auto flex justify-between items-center">
                  <Link to="/" className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-[#0054A6] rounded-full flex items-center justify-center">
                        <HeartIcon className="w-6 h-6 text-[#F26544]" fill="#F26544" />
                    </div>
                    <h1 className="text-xl font-bold text-[#002D5B]">Painel do Proprietário</h1>
                  </Link>
                  <Button variant="secondary" onClick={handleLogout}>Sair</Button>
              </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <h2 className="text-3xl font-bold mb-6 text-[#002D5B]">Gerenciamento de Sorteios</h2>

                <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-200 pb-4">
                    {filterOptions.map(({ key, label }) => {
                        const count = key === 'all' ? allRaffles.length : counts[key as RaffleStatus] || 0;
                        const isActive = filter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                    isActive ? 'bg-[#0054A6] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {label} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
                
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-600">
                            <thead className="bg-gray-50 text-xs uppercase tracking-wider">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Nome</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3">Data Sorteio</th>
                                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRaffles.map(raffle => (
                                    <tr key={raffle.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-[#002D5B]">{raffle.name}</td>
                                        <td className="px-6 py-4"><StatusBadge status={raffle.status} /></td>
                                        <td className="px-6 py-4">{new Date(raffle.drawDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {raffle.status === 'finished' ? (
                                                     <Button size="sm" variant="secondary" onClick={() => setRaffleToDelete(raffle)} aria-label={`Apagar ${raffle.name}`}>
                                                        <TrashIcon className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => setRaffleToEdit(raffle)}>✏️ Editar</Button>
                                                        <Link to={`/rifa/${raffle.id}/admin`}><Button size="sm" variant="secondary">📊 Detalhes</Button></Link>
                                                        <Button size="sm" variant="secondary" onClick={() => setRaffleToDelete(raffle)} aria-label={`Apagar ${raffle.name}`}>
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
                                                        {raffle.status === 'awaiting_payment' && (
                                                            <Button size="sm" onClick={() => setRaffleToConfirmPayment(raffle)}>💰 Pagamento Confirmado</Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRaffles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-gray-500">Nenhum sorteio encontrado para este filtro.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>

            {raffleToEdit && <EditRaffleModal raffle={raffleToEdit} onClose={() => setRaffleToEdit(null)} onSave={handleSaveEdit} />}
            {raffleToDelete && <DeleteConfirmationModal raffleName={raffleToDelete.name} onClose={() => setRaffleToDelete(null)} onConfirm={handleConfirmDelete} />}
            {raffleToConfirmPayment && (
                <PaymentConfirmationModal
                    raffleName={raffleToConfirmPayment.name}
                    onClose={() => setRaffleToConfirmPayment(null)}
                    onConfirm={handleConfirmRafflePayment}
                />
            )}
        </div>
    );
};

export default SiteAdminPage;