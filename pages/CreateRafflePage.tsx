
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { storage } from '../lib/storage';
import { adminSecurity } from '../lib/supabase-config';
import { createPixCharge } from '../lib/abacatepay-config';
import { TicketIcon, PlusIcon, UploadIcon, TrashIcon } from '../components/icons';
import { Prize } from '../types';
import { formatPhoneNumber, validatePhoneNumber } from '../lib/utils';

type PrizeInput = Omit<Prize, 'id'>;

const InputField: React.FC<{ label: string; id: string; type: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; required?: boolean; isTextArea?: boolean; children?: React.ReactNode; min?: string }> = ({ label, id, type, value, onChange, required = false, isTextArea = false, children, min }) => (
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
      <input type={type} id={id} value={value} onChange={onChange} required={required} min={min} className="w-full bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition" />
    )}
  </div>
);

const CreateRafflePage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketPriceError, setTicketPriceError] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [totalTicketsError, setTotalTicketsError] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [responsiblePhoneError, setResponsiblePhoneError] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'email' | 'phone' | 'cpf' | 'random'>('random');
  const [pixKey, setPixKey] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [prizes, setPrizes] = useState<PrizeInput[]>([{ description: '', photo: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const RAFFLE_FEE = 20.00;
  
  const navigate = useNavigate();

  const handleTicketPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTicketPrice(value);
    if (value && parseFloat(value) < 1) {
        setTicketPriceError('O preço do bilhete só pode ser um número positivo, iniciando do número 1.');
    } else {
        setTicketPriceError('');
    }
  };

  const handlePrizeChange = (index: number, field: 'description' | 'photo', value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index][field] = value;
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
    setPrizes([...prizes, { description: '', photo: '' }]);
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

  const handleTotalTicketsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTotalTickets(value);
    if (value && parseInt(value, 10) < 1) {
        setTotalTicketsError('O total de bilhetes só podem ser números positivos, iniciando do número 1.');
    } else {
        setTotalTicketsError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isPhoneValid = validatePhoneNumber(responsiblePhone);
    if (!isPhoneValid) {
        setResponsiblePhoneError('preencha o telefone corretamente');
        return;
    }

    const totalTicketsValue = parseInt(totalTickets, 10);
    const isTotalTicketsValid = !isNaN(totalTicketsValue) && totalTicketsValue >= 1;
    if (!isTotalTicketsValid) {
        setTotalTicketsError('O total de bilhetes inválido.');
        return;
    }

    const ticketPriceValue = parseFloat(ticketPrice);
    const isTicketPriceValid = !isNaN(ticketPriceValue) && ticketPriceValue >= 1;
    if (!isTicketPriceValid) {
        setTicketPriceError('O preço do bilhete inválido.');
        return;
    }

    if (name && description && ticketPrice && totalTickets && drawDate && responsibleName && pixKey && adminEmail && adminPassword && prizes.every(p => p.description)) {
      
      setIsSubmitting(true);

      try {
        // 1. Save Local Data
        const newRaffle = storage.raffles.save({
          name,
          description,
          ticketPrice: ticketPriceValue,
          totalTickets: totalTicketsValue,
          drawDate: new Date(drawDate).toISOString(),
          responsibleName,
          responsiblePhone,
          pixKeyType,
          pixKey,
          adminEmail,
          adminPassword,
          prizes: prizes.map((p, i) => ({ ...p, id: `prize-${i}` })),
        });

        // 2. Save Secure Credentials (Supabase)
        await adminSecurity.createRaffleAdmin(
            newRaffle.id, 
            adminEmail, 
            adminPassword
        );

        // 3. Create AbacatePay Charge (Integration)
        const billing = await createPixCharge(
            RAFFLE_FEE * 100, // Convert to cents
            { name: responsibleName, phone: responsiblePhone, email: adminEmail },
            `Ativação Rifa: ${name}`,
            `${window.location.origin}/#/rifa/${newRaffle.id}/pagamento`
        );

        if (billing) {
            // Update payment record with AbacatePay details
            const payments = storage.payments.getAll();
            const paymentIndex = payments.findIndex(p => p.id === newRaffle.paymentId);
            if (paymentIndex > -1) {
                payments[paymentIndex].abacatePayId = billing.id;
                payments[paymentIndex].abacatePayUrl = billing.url;
                payments[paymentIndex].abacatePayPixCode = billing.pix?.code;
                storage.payments.saveAll(payments);
            }
        } else {
            console.warn("Could not create AbacatePay charge. Falling back to manual mode.");
        }

        // Navigate to Payment Page
        navigate(`/rifa/${newRaffle.id}/pagamento`);
      } catch (error) {
        console.error("Error creating raffle:", error);
        alert("Ocorreu um erro ao criar a rifa. Tente novamente.");
      } finally {
        setIsSubmitting(false);
      }

    } else {
        alert("Por favor, preencha todos os campos obrigatórios.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#0054A6] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-4">
              <TicketIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#002D5B]">Criar Novo Sorteio</h1>
            <p className="text-gray-600 mt-2">Preencha os detalhes abaixo para iniciar seu sorteio.</p>
        </div>
      
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-8 rounded-xl shadow-2xl space-y-6">
          <fieldset className="border border-gray-200 p-4 rounded-lg">
             <legend className="px-2 text-[#0054A6] font-semibold">Informações do Sorteio</legend>
             <div className="space-y-4">
                <InputField label="Nome do Sorteio" id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                <InputField label="Descrição" id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} required isTextArea />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <InputField label="Preço do Bilhete (R$)" id="ticketPrice" type="number" value={ticketPrice} onChange={handleTicketPriceChange} required min="1" />
                        {ticketPriceError && <p className="text-red-500 text-sm mt-1">{ticketPriceError}</p>}
                    </div>
                    <div>
                        <InputField label="Total de Bilhetes" id="totalTickets" type="number" value={totalTickets} onChange={handleTotalTicketsChange} required min="1" />
                        {totalTicketsError && <p className="text-red-500 text-sm mt-1">{totalTicketsError}</p>}
                    </div>
                    <InputField label="Data do Sorteio" id="drawDate" type="date" value={drawDate} onChange={(e) => setDrawDate(e.target.value)} required />
                </div>
             </div>
          </fieldset>

           <fieldset className="border border-gray-200 p-4 rounded-lg">
             <legend className="px-2 text-[#0054A6] font-semibold">Prêmios</legend>
             <div className="space-y-4">
                {prizes.map((prize, index) => (
                    <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <InputField label="E-mail do Administrador" id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                <InputField label="Senha do Administrador" id="adminPassword" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
             </div>
          </fieldset>

          <fieldset className="border border-gray-200 p-4 rounded-lg">
            <legend className="px-2 text-[#0054A6] font-semibold">Taxa de Ativação (AbacatePay)</legend>
            <div className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4 font-semibold text-center">
                <p>
                    O pagamento da taxa de <strong>R$ {RAFFLE_FEE.toFixed(2).replace('.', ',')}</strong> será processado via PIX (AbacatePay) na próxima etapa.
                </p>
            </div>
          </fieldset>
          
          <div className="flex items-center justify-end gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Gerando cobrança...' : 'Gerar PIX e Continuar'}
            </Button>
            <Link to="/"><Button type="button" variant="secondary">Cancelar</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRafflePage;
