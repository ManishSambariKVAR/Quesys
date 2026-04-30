import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './UserManagement.css'; // Utilizing existing CSS base

interface TokenLog {
    id: number;
    token_id: string;
    user_id: string;
    dep: string;
    generated_time: string;
    call_time: string;
    ack_time: string;
    end_time: string;
    info_json: any;
}

export default function GrievanceReports() {
    const [logs, setLogs] = useState<TokenLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/reports/logs', {
                params: { fromDate, toDate }
            });
            setLogs(res.data.logs || []);
        } catch (err) {
            console.error('Failed to parse grievance logs', err);
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

    const getAggregatedData = () => {
        const grievancesMap: Record<string, number> = {};
        let totalTokens = 0;
        let skippedTokens = 0;
        let servedTokens = 0;
        let totalTime = 0;

        logs.forEach(item => {
            // isServed is based on whether it was acknowledged/ended. Based on EJS: user_id != '0' and ack_time exists!
            // In EJS it was ack_status, but here we can check ack_time. Let's use user_id not ending up zero.
            const isServed = item.ack_time && item.end_time ? 1 : 0;
            const endTime = item.end_time ? new Date(item.end_time).getTime() : 0;
            const ackTime = item.ack_time ? new Date(item.ack_time).getTime() : 0;
            const timeSpent = isServed ? Math.max(0, endTime - ackTime) : 0;

            totalTokens++;
            skippedTokens += isServed ? 0 : 1;
            servedTokens += isServed ? 1 : 0;
            totalTime += timeSpent;

            // Group by grievance in info_json
            const grievance = item.info_json?.grievance || "Unknown";
            grievancesMap[grievance] = (grievancesMap[grievance] || 0) + 1;
        });

        const formatTime = (ms: number) => {
            const totalSeconds = Math.floor(ms / 1000);
            const m = Math.floor(totalSeconds / 60);
            const s = totalSeconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        return {
            grievancesMap,
            totalTokens,
            skippedTokens,
            servedTokens,
            pctSkipped: totalTokens > 0 ? ((skippedTokens / totalTokens) * 100).toFixed(2) : '0.00',
            pctServed: totalTokens > 0 ? ((servedTokens / totalTokens) * 100).toFixed(2) : '0.00',
            totalTimeFormatted: formatTime(totalTime),
            averageTimeFormatted: formatTime(servedTokens > 0 ? totalTime / servedTokens : 0)
        };
    };

    const data = getAggregatedData();
    const grievanceKeys = Object.keys(data.grievancesMap).filter(k => data.grievancesMap[k] > 0);

    return (
        <div className="user-management">
            <h2>Grievance Reports</h2>

            <div className="um-form" style={{ display: 'flex', gap: '15px', marginBottom: '20px', maxWidth: '400px' }}>
                <div style={{ flex: 1 }}>
                    <label>From Date</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                    <label>To Date</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
            </div>

            {loading ? (
                <div className="um-loading"><div className="spinner" /><p>Loading Reports...</p></div>
            ) : (
                <div className="um-table-wrap" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <table className="um-table" style={{ width: '100%', textAlign: 'center' }}>
                        <thead>
                            <tr>
                                {grievanceKeys.map(k => <th key={k}>{k}</th>)}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Row for grievance counts matches EJS layout */}
                            <tr>
                                {grievanceKeys.map(k => <td key={k}>{data.grievancesMap[k]}</td>)}
                                <td style={{ fontWeight: 'bold' }}>{data.totalTokens}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="um-table" style={{ width: '100%', textAlign: 'center', marginTop: '30px' }}>
                        <tbody>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Total Tokens</th>
                                <td>{data.totalTokens}</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Skipped Tokens</th>
                                <td>{data.skippedTokens}</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Percentage of skipped tokens</th>
                                <td>{data.pctSkipped}%</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Served Tokens</th>
                                <td>{data.servedTokens}</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Percentage Of Served Tokens</th>
                                <td>{data.pctServed}%</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Total Time</th>
                                <td>{data.totalTimeFormatted}</td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Average time per token</th>
                                <td>{data.averageTimeFormatted}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
