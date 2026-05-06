import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './Dashboard.css';

interface DashboardData {
    factorySettings: { call: number; ack: number; end: number };
    departments: { id: number; department: string; dep: string; kiosk_id: string }[];
    companyName: string;
    autoLogoutTime: number;
    featureFlags: { recallBtn: boolean; reassignBtn: boolean; changeDept: boolean };
}

interface TokenData {
    token_total_count: number;
    token_current_count: number;
    token_skip_count: number;
    reassign_token: number | null;
    dep: string;
}

interface TokenLogEntry {
    id?: number;
    token_id: number;
    call_time: string | null;
    ack_time: string | null;
    end_time: string | null;
    time_interval: unknown;
    dep: string;
    reassign_dep?: string;
    prefix: string;
    priority?: string | boolean | null;
    recallstatus?: boolean;
}

interface TokenUpdateResponse {
    data: TokenData[];
    prefix: string;
    token_log: TokenLogEntry[];
    user: unknown;
}

const ITEMS_PER_PAGE = 5;

export default function Dashboard() {
    const { user } = useAuth();
    const [dashData, setDashData] = useState<DashboardData | null>(null);
    const [currentTime, setCurrentTime] = useState('');
    const [totalTokens, setTotalTokens] = useState('0');
    const [currentToken, setCurrentToken] = useState('0');
    const [operatorToken, setOperatorToken] = useState('0');
    const [balanceTokens, setBalanceTokens] = useState(0);
    const [skippedTokens, setSkippedTokens] = useState(0);
    const [assignedTokens, setAssignedTokens] = useState(0);
    const [tokenLogs, setTokenLogs] = useState<TokenLogEntry[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [timerDisplay, setTimerDisplay] = useState('00:00');
    const [callDisabled, setCallDisabled] = useState(false);
    const [ackDisabled, setAckDisabled] = useState(true);
    const [endDisabled, setEndDisabled] = useState(true);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch dashboard configuration data
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get<DashboardData>('/admin/dashboard');
                setDashData(res.data);
            } catch (err) {
                console.error('Failed to load dashboard:', err);
            }
        };
        fetchDashboard();
    }, []);

    // Live clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            setCurrentTime(`${hours}:${minutes}:${seconds} ${ampm}`);
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Poll token data from /update endpoint (same as old /updateData)
    const pollTokenData = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get<TokenUpdateResponse>(
                `/admin/dashboard/update?userId=${user.userId}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}`
            );
            const data = res.data.data?.[0];
            const prefix = res.data.prefix || '';
            if (data) {
                setTotalTokens(prefix + data.token_total_count);
                setCurrentToken(prefix + data.token_current_count);
                setOperatorToken(prefix + data.token_current_count);
                setSkippedTokens(data.token_skip_count);
                setAssignedTokens(data.reassign_token || 0);

                let balance = 0;
                res.data.token_log?.forEach((log) => {
                    if (log.time_interval === null) balance++;
                });
                setBalanceTokens(balance);
            }

            // Update token logs for the table
            if (res.data.token_log) {
                setTokenLogs(res.data.token_log);
            }
        } catch {
            // Silently handle polling errors
        }
    }, [user]);

    useEffect(() => {
        pollTokenData();
        const interval = setInterval(pollTokenData, 3000);
        return () => clearInterval(interval);
    }, [pollTokenData]);

    // Auto-logout on inactivity
    useEffect(() => {
        if (!dashData) return;
        const timeout = (dashData.autoLogoutTime || 30) * 60 * 1000;

        const resetTimer = () => {
            if (inactivityRef.current) clearTimeout(inactivityRef.current);
            inactivityRef.current = setTimeout(() => {
                window.location.href = '/login';
            }, timeout);
        };

        const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
        events.forEach((e) => document.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            events.forEach((e) => document.removeEventListener(e, resetTimer));
            if (inactivityRef.current) clearTimeout(inactivityRef.current);
        };
    }, [dashData]);

    // Timer for Call/Ack/End workflow
    const startTimer = (durationSec: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        let remaining = durationSec;
        setTimerDisplay(formatTimer(remaining));

        timerRef.current = setInterval(() => {
            remaining--;
            setTimerDisplay(formatTimer(remaining));
            if (remaining <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }, 1000);
    };

    const formatTimer = (seconds: number): string => {
        const m = String(Math.floor(Math.abs(seconds) / 60)).padStart(2, '0');
        const s = String(Math.abs(seconds) % 60).padStart(2, '0');
        return `${seconds < 0 ? '-' : ''}${m}:${s}`;
    };

    const handleCall = () => {
        setCallDisabled(true);
        setAckDisabled(false);
        setEndDisabled(true);
        const callTime = dashData?.factorySettings.call || 90;
        startTimer(callTime);
    };

    const handleAcknowledge = () => {
        setCallDisabled(true);
        setAckDisabled(true);
        setEndDisabled(false);
        const ackTime = dashData?.factorySettings.ack || 90;
        startTimer(ackTime);
    };

    const handleEnd = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerDisplay('00:00');
        setCallDisabled(false);
        setAckDisabled(true);
        setEndDisabled(true);
    };

    // Pagination
    const totalPages = Math.max(1, Math.ceil(tokenLogs.length / ITEMS_PER_PAGE));
    const paginatedLogs = tokenLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleRecall = async (log: TokenLogEntry) => {
        if (!user) return;
        try {
            await api.post(
                `/admin/tokens/recall?userId=${user.userId}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}&tokenNumber=${log.token_id}`
            );
            pollTokenData();
        } catch (err) {
            console.error('Recall failed:', err);
        }
    };

    const handleReassign = async (log: TokenLogEntry) => {
        if (!user || !dashData) return;
        // For now, show a simple prompt for reassign department
        const departments = dashData.departments.filter(d => d.department !== user.department);
        if (departments.length === 0) {
            alert('No other departments available for reassign.');
            return;
        }
        const deptList = departments.map(d => d.department).join(', ');
        const targetDept = prompt(`Reassign token ${log.prefix}${String(log.token_id).padStart(3, '0')} to which department?\nAvailable: ${deptList}`);
        if (!targetDept) return;

        try {
            await api.post(
                `/admin/tokens/reassign?userId=${user.userId}&userName=${user.name}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}`,
                {
                    tokenId2: log.token_id,
                    logId: log.id,
                    ReassignDepT: targetDept,
                    ReassignDepF: user.department,
                }
            );
            pollTokenData();
        } catch (err) {
            console.error('Reassign failed:', err);
        }
    };

    const formatAckTime = (ackTime: string | null): string => {
        if (!ackTime) return 'N/A';
        try {
            const d = new Date(ackTime);
            const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
            return `${date}, ${time}`;
        } catch {
            return String(ackTime);
        }
    };

    const formatTimeTaken = (timeInterval: unknown): string => {
        if (timeInterval === null || timeInterval === undefined) return 'N/A';
        if (typeof timeInterval === 'object' && timeInterval !== null) {
            const interval = timeInterval as { hours?: number; minutes?: number; seconds?: number };
            const parts = [];
            if (interval.hours) parts.push(`${interval.hours}h`);
            if (interval.minutes) parts.push(`${interval.minutes}m`);
            if (interval.seconds) parts.push(`${interval.seconds}s`);
            return parts.length > 0 ? parts.join(' ') : 'N/A';
        }
        return String(timeInterval);
    };

    if (!dashData) {
        return (
            <div className="dashboard-loading">
                <div className="spinner" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Header / Live Clock */}
            <div className="dashboard-header">
                <span className="dashboard-clock">{currentTime}</span>
            </div>

            {/* Timer Bar */}
            <div className="timer-bar">
                <span className="timer-icon">
                    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                </span>
                <span className="timer-text">Time: {timerDisplay}</span>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button
                    className="action-btn call-btn"
                    onClick={handleCall}
                    disabled={callDisabled}
                >
                    Call
                </button>
                <button
                    className="action-btn ack-btn"
                    onClick={handleAcknowledge}
                    disabled={ackDisabled}
                >
                    Ack
                </button>
                <button
                    className="action-btn end-btn"
                    onClick={handleEnd}
                    disabled={endDisabled}
                >
                    End
                </button>
            </div>

            {/* Token Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h4>Total<br />Tokens:</h4>
                    <h2>{totalTokens}</h2>
                </div>
                <div className="stat-card">
                    <h4>OPR.<br />Current Token</h4>
                    <h2>{operatorToken}</h2>
                </div>
                <div className="stat-card">
                    <h4>Current<br />Token:</h4>
                    <h2>{currentToken}</h2>
                </div>
                <div className="stat-card">
                    <h4>Balance<br />Tokens:</h4>
                    <h2>{balanceTokens}</h2>
                </div>
                <div className="stat-card">
                    <h4>Skipped<br />Tokens:</h4>
                    <h2>{skippedTokens}</h2>
                </div>
                <div className="stat-card">
                    <h4>Assigned<br />Tokens:</h4>
                    <h2>{assignedTokens}</h2>
                </div>
            </div>

            {/* Token Log Table */}
            <div className="dashboard-table-container">
                <table className="dashboard-table">
                    <thead>
                        <tr>
                            <th>TOKEN ID</th>
                            <th>ACKNOWLEDGE TIME</th>
                            <th>TIME TAKEN</th>
                            {dashData.featureFlags.recallBtn && <th>RECALL</th>}
                            {dashData.featureFlags.reassignBtn && <th>REASSIGN</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                    No token logs
                                </td>
                            </tr>
                        ) : (
                            paginatedLogs.map((log, i) => {
                                const tokenDisplay = log.prefix + String(log.token_id).padStart(3, '0');
                                const isPriority = log.priority === 'True' || log.priority === true;
                                return (
                                    <tr key={i}>
                                        <td style={{ color: isPriority ? '#e74c3c' : '#333', fontWeight: isPriority ? 700 : 400 }}>
                                            {tokenDisplay}{isPriority ? '*' : ''}
                                        </td>
                                        <td style={{ color: log.ack_time ? '#e74c3c' : '#999' }}>
                                            {formatAckTime(log.ack_time)}
                                        </td>
                                        <td>{formatTimeTaken(log.time_interval)}</td>
                                        {dashData.featureFlags.recallBtn && (
                                            <td>
                                                <button
                                                    className="table-action-btn recall-btn"
                                                    onClick={() => handleRecall(log)}
                                                >
                                                    ReCall
                                                </button>
                                            </td>
                                        )}
                                        {dashData.featureFlags.reassignBtn && (
                                            <td>
                                                <button
                                                    className="table-action-btn reassign-btn"
                                                    onClick={() => handleReassign(log)}
                                                >
                                                    ReAssign
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                <div className="pagination">
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                    >
                        &lt;
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </div>
    );
}
