import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './UserManagement.css'; // Utilizing existing CSS base

interface SummaryRow {
  id: number;
  dep: string;
  token_total_count: number;
  token_skip_count: number;
  date: string;
}

export default function SummaryReports() {
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reports/summary', {
        params: { fromDate, toDate },
      });
      setSummaryData(res.data.summary || []);
    } catch (err) {
      console.error('Failed to parse summary logs', err);
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

  // Aggregate values mapped from the frontend.
  const getAggregatedData = () => {
    const departmentMap: Record<string, any> = {};
    let grandTotalTokens = 0;
    let grandTotalSkippedTokens = 0;
    let grandTotalServedTokens = 0;

    summaryData.forEach((obj) => {
      const department = obj.dep;
      if (!departmentMap[department]) {
        departmentMap[department] = {
          department,
          totalTokens: 0,
          skippedTokens: 0,
          servedTokens: 0,
          percentageOfServedTokens: 0,
        };
      }

      const served = obj.token_total_count - obj.token_skip_count;
      departmentMap[department].totalTokens += obj.token_total_count;
      departmentMap[department].skippedTokens += obj.token_skip_count;
      departmentMap[department].servedTokens += served;

      // Aggregates
      grandTotalTokens += obj.token_total_count;
      grandTotalSkippedTokens += obj.token_skip_count;
      grandTotalServedTokens += served;
    });

    Object.values(departmentMap).forEach((dept) => {
      dept.percentageOfServedTokens =
        dept.totalTokens > 0
          ? ((dept.servedTokens / dept.totalTokens) * 100).toFixed(2)
          : '0.00';
    });

    const grandPercentage =
      grandTotalTokens > 0
        ? ((grandTotalServedTokens / grandTotalTokens) * 100).toFixed(2)
        : '0.00';

    return {
      departmentMap,
      grandTotalTokens,
      grandTotalSkippedTokens,
      grandTotalServedTokens,
      grandPercentage,
    };
  };

  const {
    departmentMap,
    grandTotalTokens,
    grandTotalSkippedTokens,
    grandTotalServedTokens,
    grandPercentage,
  } = getAggregatedData();
  const departmentKeys = Object.keys(departmentMap);

  return (
    <div className="user-management">
      <h2>Summary Reports</h2>

      <div
        className="um-form"
        style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          maxWidth: '400px',
        }}
      >
        <div style={{ flex: 1 }}>
          <label>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="um-loading">
          <div className="spinner" />
          <p>Loading Reports...</p>
        </div>
      ) : (
        <div
          className="um-table-wrap"
          style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}
        >
          <table
            className="um-table"
            style={{ width: '100%', textAlign: 'center' }}
          >
            <thead>
              <tr>
                <th>Total</th>
                {departmentKeys.map((dept) => (
                  <th key={dept}>{dept}</th>
                ))}
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Total Tokens</td>
                {departmentKeys.map((dept) => (
                  <td key={`total-${dept}`}>
                    {departmentMap[dept].totalTokens}
                  </td>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandTotalTokens}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Skipped Tokens</td>
                {departmentKeys.map((dept) => (
                  <td key={`skip-${dept}`}>
                    {departmentMap[dept].skippedTokens}
                  </td>
                ))}
                <td style={{ fontWeight: 'bold' }}>
                  {grandTotalSkippedTokens}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>Served Tokens</td>
                {departmentKeys.map((dept) => (
                  <td key={`served-${dept}`}>
                    {departmentMap[dept].servedTokens}
                  </td>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandTotalServedTokens}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>% Of Served Tokens</td>
                {departmentKeys.map((dept) => (
                  <td key={`pct-${dept}`}>
                    {departmentMap[dept].percentageOfServedTokens}%
                  </td>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandPercentage}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
