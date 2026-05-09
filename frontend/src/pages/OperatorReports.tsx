import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './UserManagement.css';

interface TokenLog {
  id: number;
  token_id: string;
  user_id: string;
  dep: string;
  generated_time: string;
  call_time: string;
  ack_time: string;
  end_time: string;
}

export default function OperatorReports() {
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reports/logs', {
        params: { fromDate, toDate },
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to parse operator logs', err);
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
    const operatorMap: Record<string, any> = {};
    let grandTotalTokens = 0;
    let grandSkippedTokens = 0;
    let grandServedTokens = 0;
    let grandTotalTime = 0;

    logs.forEach((item) => {
      const operator = item.user_id;

      if (!operatorMap[operator]) {
        operatorMap[operator] = {
          userId: operator,
          totalTokens: 0,
          skippedTokens: 0,
          servedTokens: 0,
          totalTime: 0,
        };
      }

      // We determine "served" based on completion timestamps
      const isServed = item.ack_time && item.end_time ? 1 : 0;
      const endTime = item.end_time ? new Date(item.end_time).getTime() : 0;
      const ackTime = item.ack_time ? new Date(item.ack_time).getTime() : 0;
      const timeSpent = isServed ? Math.max(0, endTime - ackTime) : 0;

      operatorMap[operator].totalTokens++;
      if (isServed) {
        operatorMap[operator].servedTokens++;
      } else {
        operatorMap[operator].skippedTokens++;
      }
      operatorMap[operator].totalTime += timeSpent;

      // Grand Totals
      grandTotalTokens++;
      if (isServed) grandServedTokens++;
      else grandSkippedTokens++;
      grandTotalTime += timeSpent;
    });

    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // calculate formatted and derived values for each operator
    Object.values(operatorMap).forEach((operator) => {
      operator.percentageOfServedTokens =
        operator.totalTokens > 0
          ? ((operator.servedTokens / operator.totalTokens) * 100).toFixed(2)
          : '0.00';

      operator.pctSkipped =
        operator.totalTokens > 0
          ? ((operator.skippedTokens / operator.totalTokens) * 100).toFixed(2)
          : '0.00';

      operator.totalTimeFormatted = formatTime(operator.totalTime);

      const avgMs =
        operator.servedTokens > 0
          ? operator.totalTime / operator.servedTokens
          : 0;
      operator.averageTimeFormatted = formatTime(avgMs);

      // Contributions to the grand total
      operator.pctTotalTokens =
        grandTotalTokens > 0
          ? ((operator.totalTokens / grandTotalTokens) * 100).toFixed(2)
          : '0.00';
      operator.pctSkippedTokens =
        grandSkippedTokens > 0
          ? ((operator.skippedTokens / grandSkippedTokens) * 100).toFixed(2)
          : '0.00';
      operator.pctServedTokens =
        grandServedTokens > 0
          ? ((operator.servedTokens / grandServedTokens) * 100).toFixed(2)
          : '0.00';
    });

    return {
      operatorMap,
      grandTotalTokens,
      grandSkippedTokens,
      grandServedTokens,
      pctGrandSkipped:
        grandTotalTokens > 0
          ? ((grandSkippedTokens / grandTotalTokens) * 100).toFixed(2)
          : '0.00',
      pctGrandServed:
        grandTotalTokens > 0
          ? ((grandServedTokens / grandTotalTokens) * 100).toFixed(2)
          : '0.00',
      grandTotalTimeFormatted: formatTime(grandTotalTime),
      grandAverageTimeFormatted: formatTime(
        grandServedTokens > 0 ? grandTotalTime / grandServedTokens : 0
      ),
    };
  };

  const {
    operatorMap,
    grandTotalTokens,
    grandSkippedTokens,
    grandServedTokens,
    pctGrandSkipped,
    pctGrandServed,
    grandTotalTimeFormatted,
    grandAverageTimeFormatted,
  } = getAggregatedData();
  const operatorKeys = Object.keys(operatorMap);

  return (
    <div className="user-management">
      <h2>Operator Reports</h2>

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
            className="um-table um-report-grid"
            style={{ width: '100%', textAlign: 'center' }}
          >
            <thead>
              <tr>
                <th></th>
                {operatorKeys.map((k) => (
                  <th colSpan={2} key={k}>
                    {k}
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th style={{ textAlign: 'left' }}>Total Tokens</th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`total-${k}`}>{operatorMap[k].totalTokens}</td>
                    <td key={`total-pct-${k}`}>
                      {operatorMap[k].pctTotalTokens}%
                    </td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandTotalTokens}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>Skipped Tokens</th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`skip-${k}`}>{operatorMap[k].skippedTokens}</td>
                    <td key={`skip-pct-${k}`}>
                      {operatorMap[k].pctSkippedTokens}%
                    </td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandSkippedTokens}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  Percentage of Skipped Tokens
                </th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`pct-skip-${k}`}>{operatorMap[k].pctSkipped}%</td>
                    <td>-</td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>{pctGrandSkipped}%</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>Served Tokens</th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`served-${k}`}>{operatorMap[k].servedTokens}</td>
                    <td key={`served-pct-${k}`}>
                      {operatorMap[k].pctServedTokens}%
                    </td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>{grandServedTokens}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  Percentage of Served Tokens
                </th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`pct-served-${k}`}>
                      {operatorMap[k].percentageOfServedTokens}%
                    </td>
                    <td>-</td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>{pctGrandServed}%</td>
              </tr>
              {/* Spacer Row */}
              <tr>
                <td
                  colSpan={operatorKeys.length * 2 + 2}
                  style={{ height: '30px', background: 'transparent' }}
                ></td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>Total Time (mm:ss)</th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`time-${k}`}>
                      {operatorMap[k].totalTimeFormatted}
                    </td>
                    <td>-</td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>
                  {grandTotalTimeFormatted}
                </td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left' }}>
                  Average Time Per Token (mm:ss)
                </th>
                {operatorKeys.map((k) => (
                  <>
                    <td key={`avg-${k}`}>
                      {operatorMap[k].averageTimeFormatted}
                    </td>
                    <td>-</td>
                  </>
                ))}
                <td style={{ fontWeight: 'bold' }}>
                  {grandAverageTimeFormatted}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
