import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './UserManagement.css'; // Utilizing existing CSS base

interface TokenLog {
    id: number;
    token_id: string;
    user_id: string;
    dep: string;
    generated_time: string; // ISO dates
    call_time: string;
    ack_time: string;
    end_time: string;
    info_json: any;
    occurance: number;
}

export default function UserReports() {
    const [logs, setLogs] = useState<TokenLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/reports/logs', {
                params: { fromDate, toDate }
            });
            setLogs(res.data.logs || []);
        } catch (err) {
            console.error('Failed to parse logs', err);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => {
        // Initial fetch for today's logs
        const today = new Date().toISOString().split('T')[0];
        setFromDate(today);
        setToDate(today);
    }, []);

    useEffect(() => {
        if (fromDate && toDate) fetchReports();
    }, [fetchReports, fromDate, toDate]);

    const calculateTimes = (log: TokenLog) => {
        const generated = new Date(log.generated_time).getTime();
        const call = new Date(log.call_time).getTime();
        const ack = new Date(log.ack_time).getTime();
        const end = new Date(log.end_time).getTime();

        const formatMs = (ms: number) => {
            if (isNaN(ms) || ms < 0) return '00:00:00';
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 99) return '00:00:00'; // Out of bounds safety
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        return {
            waiting: formatMs(call - generated),
            operator: formatMs(end - ack),
            total: formatMs(end - generated),
        };
    };

    const filteredLogs = logs.filter(log => {
        const searchStr = `${log.user_id} ${log.token_id} ${log.dep}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="user-management">
            <h2>User Reports</h2>

            <div className="um-form" style={{ display: 'flex', gap: '15px', marginBottom: '20px', maxWidth: '100%', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label>From Date</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label>To Date</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                    <label>Search (User / Token / Dept)</label>
                    <input type="text" placeholder="Type to search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className="um-loading"><div className="spinner" /><p>Loading Reports...</p></div>
            ) : (
                <div className="um-table-wrap" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <table className="um-table">
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>User ID</th>
                                <th>Token No</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Details</th>
                                <th>Gen Time</th>
                                <th>Call Time</th>
                                <th>Ack Time</th>
                                <th>End Time</th>
                                <th>Operator Time</th>
                                <th>Waiting Time</th>
                                <th>Total Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => {
                                const times = calculateTimes(log);
                                const isUnserved = log.user_id === '0' || log.user_id.includes('0');
                                const callDate = new Date(log.call_time);

                                // Detailed status logic from EJS
                                let status = "Served";
                                if (times.operator === "00:00:00" && !isUnserved) status = "Skipped";
                                // A simplistic check, the actual EJS checked if dep_origin === from === to

                                let details = "";
                                if (log.occurance === 1) details = "Completed";
                                else if (log.occurance === 0) details = "Skipped";
                                else if (log.occurance > 2) details = "Recall";

                                return (
                                    <tr key={log.id}>
                                        <td>{log.dep}</td>
                                        <td>{isUnserved ? 'Token not served' : log.user_id}</td>
                                        <td>{log.token_id}</td>
                                        <td>{callDate.toLocaleDateString()}</td>
                                        <td>{status}</td>
                                        <td>{details}</td>
                                        <td>{new Date(log.generated_time).toLocaleTimeString()}</td>
                                        <td>{new Date(log.call_time).toLocaleTimeString()}</td>
                                        <td>{log.ack_time ? new Date(log.ack_time).toLocaleTimeString() : 'N/A'}</td>
                                        <td>{log.end_time ? new Date(log.end_time).toLocaleTimeString() : 'N/A'}</td>
                                        <td>{times.operator}</td>
                                        <td>{times.waiting}</td>
                                        <td>{times.total}</td>
                                    </tr>
                                );
                            })}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={13} style={{ textAlign: 'center' }}>No records found for this date range.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
