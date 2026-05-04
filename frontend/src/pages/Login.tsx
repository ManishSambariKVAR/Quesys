import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import type { Counter, CountersResponse } from '../types';
import './Login.css';

export default function Login() {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [counter, setCounter] = useState('');
    const [counters, setCounters] = useState<Counter[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [logoUrl, setLogoUrl] = useState('/images/Adhar Logo.png');

    const { login, isAuthenticated, isAdmin, authLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in — wait for auth hydration first
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
        }
    }, [authLoading, isAuthenticated, isAdmin, navigate]);

    // Fetch available counters
    useEffect(() => {
        const fetchCounters = async () => {
            try {
                const response = await api.get<CountersResponse>('/auth/counters');
                setCounters(response.data.counters);
            } catch (err) {
                console.error('Failed to fetch counters:', err);
            }
        };
        fetchCounters();
    }, []);

    // Try to load the company logo from backend
    useEffect(() => {
        const companyLogoPath = api.defaults.baseURL
            ? `${api.defaults.baseURL}/src/uploads/companyLogo.png`
            : '/src/uploads/companyLogo.png';

        fetch(companyLogoPath, { method: 'HEAD' })
            .then(res => {
                if (res.ok) setLogoUrl(companyLogoPath);
            })
            .catch(() => {});
    }, []);

    // Preloader animation — only start after auth check is done
    useEffect(() => {
        if (authLoading) return;
        const timer = setTimeout(() => setShowForm(true), 2000);
        return () => clearTimeout(timer);
    }, [authLoading]);

    // Don't render anything while checking auth (prevents flash/redirect loop)
    if (authLoading) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(userId, password, counter);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { error?: string } } };
                setError(axiosErr.response?.data?.error || 'Login failed. Please try again.');
            } else {
                setError('Network error. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Preloader */}
            <div className={`preloader ${showForm ? 'hidden' : ''}`}>
                <img src="/images/1 (3).png" alt="Loading..." className="preloader-image" />
            </div>

            {/* Login Form */}
            <div className={`login-container ${showForm ? 'visible' : ''}`}>
                <div className="login-card">
                    <div className="login-header">
                        <img
                            src={logoUrl}
                            alt="Logo"
                            className="login-logo"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/Adhar Logo.png';
                            }}
                        />
                        <h4>Sign in to your account</h4>
                    </div>

                    {error && (
                        <div className="error-alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="userId"><strong>User ID:</strong></label>
                            <input
                                id="userId"
                                type="text"
                                className="form-control"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="UserId"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password"><strong>Password:</strong></label>
                            <input
                                id="password"
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="counter"><strong>Counter:</strong></label>
                            <select
                                id="counter"
                                className="form-control"
                                value={counter}
                                onChange={(e) => setCounter(e.target.value)}
                            >
                                <option value="" disabled>Select Counter</option>
                                {counters.map((c) => (
                                    <option key={c.id} value={c.counter}>
                                        {c.counter}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <img src="/images/Quesys.png" alt="Quesys" className="footer-logo" />
                    </div>
                </div>
            </div>
        </div>
    );
}
