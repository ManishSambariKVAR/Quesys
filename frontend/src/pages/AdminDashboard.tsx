import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import api from '../api';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ── Types 
interface TokenData {
  dep: string;
  token_current_count: number;
  token_total_count: number;
  token_skip_count: number;
  date: string;
}

interface UserLog {
  userid: string;
  log: string | number;
  department: string;
  updatedat: string;
}

interface AdminDashboardData {
  departments: TokenData[];
  userLog: UserLog[];
  currDt: string;
  currTm: string;
}

// ── Constants
const BACKGROUND_COLORS = [
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(82, 242, 247)',
  'rgb(39, 163, 74)',
  'rgb(138, 74, 168)',
  'rgb(196, 153, 108)',
  'rgb(214, 223, 34)',
];

// ── Helpers 
function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return { date: `${day}-${month}-${year}`, time: `${hours}:${minutes}` };
}

function useLiveClock() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Main Component 
export default function AdminDashboard() {
  const [dashData, setDashData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const liveTime = useLiveClock();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get<AdminDashboardData>('/admin/dashboard');
        console.log("🔍 DATA FROM BACKEND:", res.data);
        setDashData(res.data);
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={s.centered}>
      <div style={s.spinner} />
      <p style={{ color: '#888', marginTop: 16 }}>Loading dashboard…</p>
    </div>
  );

  if (error) return (
    <div style={s.centered}>
      <p style={{ color: '#e74c3c' }}>{error}</p>
    </div>
  );

  const data = dashData?.departments ?? [];
  const userLogs = dashData?.userLog ?? [];
  const currDt = dashData?.currDt ?? new Date().toISOString().split('T')[0];

  // ── Aggregate 
  const departmentNames: string[] = [];
  const totalTokens: number[] = [];
  let grandTotalTokens = 0;
  let grandTotalSkippedTokens = 0;
  let grandTotalServedTokens = 0;

  const deptMap: Record<string, { totalTokens: number; skippedTokens: number; servedTokens: number }> = {};
  data.forEach(d => {
    if (!deptMap[d.dep]) deptMap[d.dep] = { totalTokens: 0, skippedTokens: 0, servedTokens: 0 };
    deptMap[d.dep].totalTokens += d.token_total_count;
    deptMap[d.dep].skippedTokens += d.token_skip_count;
    deptMap[d.dep].servedTokens += d.token_total_count - d.token_skip_count;
  });

  Object.entries(deptMap).forEach(([name, v]) => {
    departmentNames.push(name);
    totalTokens.push(v.totalTokens);
    grandTotalTokens += v.totalTokens;
    grandTotalSkippedTokens += v.skippedTokens;
    grandTotalServedTokens += v.servedTokens;
  });

  // ── Chart data ────────────────────────────────────
  const pieChartData = {
    labels: departmentNames,
    datasets: [{
      data: totalTokens,
      backgroundColor: BACKGROUND_COLORS,
    }],
  };

  const barChartData = {
    labels: ['Total Tokens', 'Skipped Tokens', 'Served Tokens'],
    datasets: [{
      label: 'Token Summary',
      data: [grandTotalTokens, grandTotalSkippedTokens, grandTotalServedTokens],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(75, 192, 192, 0.2)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(75, 192, 192, 1)',
      ],
      borderWidth: 1,
    }],
  };

  const barOptions = {
    scales: { y: { beginAtZero: true, suggestedMax: 5.0 } },
    plugins: { legend: { display: false } },
  };

  return (
    <div style={s.page}>

      {/* Sub header */}
      <div style={s.subHeader}>
        <h5 style={s.welcomeText}>Welcome Admin</h5>
        <h5 style={s.dateTime}>{currDt} &nbsp;&nbsp; {liveTime}</h5>
      </div>

      {/* Charts Row */}
      <div style={s.row}>

        {/* Pie Chart card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h4 style={s.cardTitle}>Pie Chart: {currDt}</h4>
          </div>
          <div style={{ ...s.cardBody, display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Legend — matches original #departmentList */}
            <div style={{ flex: 1, paddingLeft: 10 }}>
              {departmentNames.map((name, i) => (
                <div key={name} style={s.legendItem}>
                  <span style={{
                    width: 18, height: 18, display: 'inline-block', flexShrink: 0,
                    backgroundColor: BACKGROUND_COLORS[i % BACKGROUND_COLORS.length],
                    marginRight: 10
                  }} />
                  {name}
                </div>
              ))}
            </div>
            {/* Pie canvas */}
            <div style={{ flex: 1.5, maxWidth: 300, maxHeight: 300, display: 'flex', justifyContent: 'center' }}>
              <Pie data={pieChartData} options={{ plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>

        {/* Bar Chart card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h4 style={s.cardTitle}>Bar Graphs: {currDt}</h4>
          </div>
          <div style={s.cardBody}>
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>

      </div>

      {/* Today's Summary */}
      <h4 style={s.sectionTitle}>Today's Summary</h4>
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={s.cardBody}>
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>SR</th>
                  <th style={s.th}>DEPARTMENT</th>
                  <th style={s.th}>CURRENT TOKEN</th>
                  <th style={s.th}>TOKEN SKIP</th>
                  <th style={s.th}>TOTAL TOKEN</th>
                  <th style={s.th}>TOKEN BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0
                  ? <tr><td colSpan={6} style={s.empty}>No data for today</td></tr>
                  : data.map((dta, i) => (
                    <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}>{i + 1}</td>
                      <td style={s.td}>{dta.dep}</td>
                      <td style={s.td}>{dta.token_current_count}</td>
                      <td style={s.td}>{dta.token_skip_count}</td>
                      <td style={s.td}>{dta.token_total_count}</td>
                      <td style={s.td}>{dta.token_total_count - dta.token_current_count}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Login Users */}
      <h4 style={s.sectionTitle}>Login Users</h4>
      <div style={{ ...s.card, marginBottom: 32 }}>
        <div style={s.cardBody}>
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>SR</th>
                  <th style={s.th}>USER ID</th>
                  <th style={s.th}>LOGIN</th>
                  <th style={s.th}>DEPARTMENT</th>
                  <th style={s.th}>STATUS</th>
                  <th style={s.th}>UPDATE TIME</th>
                </tr>
              </thead>
              <tbody>
                {userLogs.length === 0
                  ? <tr><td colSpan={6} style={s.empty}>No login activity today</td></tr>
                  : userLogs.map((log: UserLog, i: number) => {
                    const isLoggedIn = String(log.log) === '1';
                    const dt = formatDateTime(log.updatedat);
                    return (
                      <tr key={i} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                        <td style={s.td}>{i + 1}</td>
                        <td style={s.td}>
                          <div style={s.userCell}>
                            <img src="/images/pngtree-business-male-icon-vector-png-image_916468-removebg-preview.png" width={30}
                              style={{ borderRadius: '50%' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              alt="" />
                            {log.userid}
                          </div>
                        </td>
                        <td style={s.td}>
                          <div style={{
                            width: 15, height: 15, borderRadius: '50%', margin: '0 auto',
                            backgroundColor: isLoggedIn ? '#4caf50' : '#f44336',
                          }} />
                        </td>
                        <td style={s.td}>{log.department}</td>
                        <td style={s.td}>{isLoggedIn ? 'Logged In' : 'Log Out'}</td>
                        <td style={s.td}>
                          <div>{dt.date}</div>
                          <div style={{ color: '#888', fontSize: 12 }}>{dt.time}</div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    padding: '0 30px 30px',
    fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
    background: '#f4f6fb',
    minHeight: '100vh',
  },
  subHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 0',
    marginBottom: 10,
  },
  welcomeText: { margin: 0, fontSize: 16, fontWeight: 500, color: '#333' },
  dateTime: { margin: 0, fontSize: 15, fontWeight: 700, color: '#000', letterSpacing: '0.5px' },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 30,
    marginBottom: 30,
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  cardHeader: { padding: '20px 25px 15px', borderBottom: 'none' },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 500, color: '#333' },
  cardBody: { padding: '15px 25px 25px' },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    marginBottom: 12,
    color: '#666',
  },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#333', margin: '0 0 15px 0' },
  tableWrapper: { overflowX: 'auto', margin: '0 -25px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#fdfdfd' },
  th: {
    padding: '15px 20px',
    textAlign: 'center',
    fontWeight: 700,
    color: '#888',
    borderBottom: '1px solid #eaeaea',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: '0.5px'
  },
  td: {
    padding: '16px 20px',
    textAlign: 'center',
    color: '#555',
    borderBottom: '1px solid #f4f4f4',
  },
  trEven: { background: '#fff' },
  trOdd: { background: '#fafbfc' },
  empty: { padding: 30, textAlign: 'center', color: '#aaa', fontStyle: 'italic' },
  userCell: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #2154c5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};