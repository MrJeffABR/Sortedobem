import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storage } from '../lib/storage';
import Button from '../components/Button';
import { LockIcon, HeartIcon } from '../components/icons';

const SiteAdminLoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // If already logged in, redirect to dashboard
        if (sessionStorage.getItem('siteAdminAuthenticated') === 'true') {
            navigate('/admin/dashboard');
        }
    }, [navigate]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (storage.raffles.checkSiteAdminCredentials(email, password)) {
            sessionStorage.setItem('siteAdminAuthenticated', 'true');
            navigate('/admin/dashboard');
        } else {
            setError('Credenciais inválidas. Tente novamente.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link to="/" className="flex items-center justify-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#0054A6] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <HeartIcon className="w-7 h-7 text-[#F26544]" fill="#F26544" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#002D5B]">SORTE DO BEM</h1>
                            <p className="text-sm text-gray-600">Painel do Proprietário</p>
                        </div>
                    </Link>
                    <LockIcon className="w-10 h-10 mx-auto text-[#0054A6]" />
                    <h2 className="text-2xl font-bold mt-4">Acesso Restrito</h2>
                </div>
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg border border-gray-200 shadow-md space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition"
                            placeholder="teste@gmail.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 focus:ring-[#0054A6] focus:border-[#0054A6] transition"
                            placeholder="123456"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="pt-2 flex justify-between items-center">
                        <Button type="submit">Entrar</Button>
                        <Link to="/">
                            <Button type="button" variant="secondary">Voltar</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SiteAdminLoginPage;