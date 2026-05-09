import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './Dashboard.css';

interface DashboardData {
  factorySettings: { call: number; ack: number; end: number };
  departments: {
    id: number;
    department: string;
    dep: string;
    kiosk_id: string;
  }[];
  companyName: string;
  autoLogoutTime: number;
  featureFlags: {
    recallBtn: boolean;
    reassignBtn: boolean;
    changeDept: boolean;
  };
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
  ack_status?: boolean;
  user_id?: string;
  reassign_active?: boolean;
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
  const [totalTokenCount, setTotalTokenCount] = useState(0);
  const [currentToken, setCurrentToken] = useState('0');
  const [operatorToken, setOperatorToken] = useState('0');
  const [balanceTokens, setBalanceTokens] = useState(0);
  const [skippedTokens, setSkippedTokens] = useState(0);
  const [assignedTokens, setAssignedTokens] = useState(0);
  const [tokenLogs, setTokenLogs] = useState<TokenLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [timerDisplay, setTimerDisplay] = useState('00:00');

  // Reassign Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reassignLog, setReassignLog] = useState<TokenLogEntry | null>(null);
  const [targetDept, setTargetDept] = useState('');

  const [callDisabled, setCallDisabled] = useState(false);
  const [ackDisabled, setAckDisabled] = useState(true);
  const [endDisabled, setEndDisabled] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<number | null>(null);

  // Refs for API integration logic
  const localTokenCount = useRef<number>(0);
  const [localTokenCountState, setLocalTokenCountState] = useState(0);
  const currentPrefix = useRef<string>('');
  const [currentPrefixState, setCurrentPrefixState] = useState('');
  const currentBypass = useRef<boolean>(false);
  const currentNotInc = useRef<boolean>(false);
  const callTimeRef = useRef<string>('');
  const ackTimeRef = useRef<string>('');
  const acknowledgmentStatus = useRef<boolean>(false);

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

  // Poll token data from /update endpoint
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
        setTotalTokenCount(data.token_total_count);

        if (!currentBypass.current) {
          localTokenCount.current = data.token_current_count;
          currentPrefix.current = prefix;
          setLocalTokenCountState(data.token_current_count);
          setCurrentPrefixState(prefix);
          setCurrentToken(prefix + data.token_current_count);
          setOperatorToken(prefix + data.token_current_count);
        }

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
        const sortedLogs = [...(res.data.token_log || [])].sort(
          (a, b) => b.token_id - a.token_id
        );

        setTokenLogs(sortedLogs);
      }
    } catch {
      // Silently handle polling errors
    }
  }, [user]);

  useEffect(() => {
    const initial = setTimeout(() => {
      void pollTokenData();
    }, 0);
    const interval = setInterval(pollTokenData, 3000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
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

  // Timer and Progress Bar for Call/Ack/End workflow
  const [progressPercent, setProgressPercent] = useState(0);
  const progressPercentRef = useRef(0);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const totalDurationRef = useRef(30);

  const startTimer = () => {
    let seconds = elapsedRef.current;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      seconds++;
      elapsedRef.current = seconds;

      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');

      setTimerDisplay(`${m}:${s}`);
    }, 1000);
  };

  const startProgressBar = (duration: number) => {
    const startTime = Date.now();

    if (progressRef.current) cancelAnimationFrame(progressRef.current);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setProgressPercent(progress);
      progressPercentRef.current = progress;

      if (progress < 100) {
        progressRef.current = requestAnimationFrame(animate);
      }
    };

    progressRef.current = requestAnimationFrame(animate);
  };

  const resetProgressBar = () => {
    if (progressRef.current) cancelAnimationFrame(progressRef.current);

    setProgressPercent(0);
    progressPercentRef.current = 0;
  };

  const addExtraTime = (ms: number) => {
    setShowTimeoutModal(false);
    resetProgressBar();
    startProgressBar(ms * 1000);
    clearTimeout(timeoutRef.current!);

    timeoutRef.current = setTimeout(() => {
      if (!acknowledgmentStatus.current) {
        setShowTimeoutModal(true);
      }
    }, ms * 1000);
  };

  const handleCall = async () => {
    if (!user) return;
    if (!currentNotInc.current && localTokenCount.current >= totalTokenCount) return;

    acknowledgmentStatus.current = false;

    // Increment token locally if not a recall
    if (!currentNotInc.current) {
      localTokenCount.current += 1;
    }
    currentNotInc.current = false;
    currentBypass.current = true;
    setLocalTokenCountState(localTokenCount.current);

    const prefix = currentPrefix.current;
    const newTokenNum = localTokenCount.current;
    const newTokenStr = prefix + newTokenNum;

    setCurrentToken(newTokenStr);
    setOperatorToken(newTokenStr);

    const callTime = new Date();
    callTimeRef.current = callTime.toISOString();

    setCallDisabled(true);
    setAckDisabled(false);
    setEndDisabled(false);

    elapsedRef.current = 0;
    resetProgressBar();

    const callTimeSec = dashData?.factorySettings.call || 90;

    startProgressBar(callTimeSec * 1000);
    startTimer();

    timeoutRef.current = setTimeout(() => {
      if (!acknowledgmentStatus.current) {
        setShowTimeoutModal(true);
      }
    }, callTimeSec * 1000);

    try {
      const fnToken = String(newTokenNum).padStart(3, '0');
      await api.post(
        `/admin/tokens/display?userId=${user.userId}&userName=${user.name}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}&tokenNumber=${prefix + fnToken}&tokenNumber2=${newTokenNum}`,
        { data: 'call token' }
      );
    } catch (err) {
      console.error('Call failed:', err);
    }
  };

  const handleAcknowledge = () => {
    setShowTimeoutModal(false);
    if (!acknowledgmentStatus.current) {
      const ackTime = new Date();
      ackTimeRef.current = ackTime.toISOString();
      acknowledgmentStatus.current = true;
    }

    setCallDisabled(true);
    setAckDisabled(true);
    setEndDisabled(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    elapsedRef.current = 0;
    resetProgressBar();
    startTimer();
  };

  const handleEnd = async () => {
    elapsedRef.current = 0;

    totalDurationRef.current = 30;
    if (!user) return;

    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTimeoutModal(false);
    setTimerDisplay('00:00');
    resetProgressBar();

    const endTime = new Date();
    const endTimeStr = endTime.toISOString();

    const reqData: {
      tokenNumber: number;
      callTime: string;
      endTime: string;
      acknowledged: boolean;
      prefix: string;
      ackTime?: string;
    } = {
      tokenNumber: localTokenCount.current,
      callTime: callTimeRef.current,
      endTime: endTimeStr,
      acknowledged: acknowledgmentStatus.current,
      prefix: currentPrefix.current,
    };

    if (acknowledgmentStatus.current) {
      reqData.ackTime = ackTimeRef.current;
    }

    setCallDisabled(false);
    setAckDisabled(true);
    setEndDisabled(true);

    try {
      await api.post(
        `/admin/tokens/store?userId=${user.userId}&userName=${user.name}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}`,
        reqData
      );
      currentBypass.current = false;
      currentNotInc.current = false;
    } catch (err) {
      console.error('End failed:', err);
    }

    acknowledgmentStatus.current = false;
    pollTokenData();
  };

  // Pagination
  const filteredLogs = tokenLogs;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  );

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleRecall = async (log: TokenLogEntry) => {
    if (!user) return;

    localTokenCount.current = log.token_id;
    currentPrefix.current = log.prefix;
    setLocalTokenCountState(log.token_id);
    setCurrentPrefixState(log.prefix);
    currentBypass.current = true;
    currentNotInc.current = true;

    setCurrentToken(log.prefix + log.token_id);
    setOperatorToken(log.prefix + log.token_id);

    try {
      await api.post(
        `/admin/tokens/recall?userId=${user.userId}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}&tokenNumber=${log.token_id}`,
        {
          prefix: log.prefix,
        }
      );

      pollTokenData();
    } catch (err) {
      console.error('Recall failed:', err);
    }
  };

  const handleReassign = (log: TokenLogEntry) => {
    if (!user || !dashData) return;
    const availableDepts = dashData.departments.filter(
      (d) => d.department !== user.department
    );
    if (availableDepts.length === 0) {
      alert('No other departments available for reassign.');
      return;
    }
    setReassignLog(log);
    setTargetDept('');
    setShowReassignModal(true);
  };

  const handleConfirmReassignClick = () => {
    if (targetDept) {
      setShowReassignModal(false);
      setShowConfirmModal(true);
    }
  };

  const confirmReassign = async () => {
    if (!user || !reassignLog || !targetDept) return;

    setShowConfirmModal(false);

    try {
      await api.post(
        `/admin/tokens/reassign?userId=${user.userId}&userName=${user.name}&userDepartment=${user.department}&counter=${user.counter}&kioskId=${user.kioskId}`,
        {
          tokenId2: reassignLog.token_id,
          logId: reassignLog.id,
          ReassignDepT: targetDept,
          ReassignDepF: user.department,
        }
      );
      setReassignLog(null);
      setTargetDept('');
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
      const interval = timeInterval as {
        hours?: number;
        minutes?: number;
        seconds?: number;
        milliseconds?: number;
      };
      const h = interval.hours ? String(interval.hours).padStart(2, '0') : '00';
      const m = interval.minutes
        ? String(interval.minutes).padStart(2, '0')
        : '00';
      const ms = interval.milliseconds
        ? String(interval.milliseconds).padStart(3, '0')
        : '000';
      // The old format looked like: "00 : 00 : 1 : 264"
      return `${h} : ${m} : ${interval.seconds || 0} : ${ms}`;
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
      <div
        className="dashboard-header"
        style={{ marginTop: '-15px', marginBottom: '15px' }}
      >
        <span className="dashboard-clock">{currentTime}</span>
      </div>

      {/* Timer Bar */}
      <div className="progress-container">
        <svg
          stroke="currentColor"
          fill="none"
          strokeWidth="2"
          viewBox="0 0 24 24"
          strokeLinecap="round"
          strokeLinejoin="round"
          height="20"
          width="20"
          style={{ margin: '10px' }}
        >
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <h5
          className="dashboard_bar m-0"
          style={{ fontWeight: 'normal', color: '#000', margin: '0' }}
        >
          Time: <span id="timer">{timerDisplay}</span>
        </h5>
        <div
          className="progress-bar"
          style={{
            marginLeft: '10px',
            width: `${progressPercent}%`,
            height: '10px',
            backgroundColor: '#4caf50',
            borderRadius: '0',
            transition: 'none',
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="row mb-4 action-buttons">
        <div className="col-4">
          <button
            className="action-btn call-btn w-100"
            onClick={handleCall}
            disabled={callDisabled || (!currentNotInc.current && localTokenCountState >= totalTokenCount)}
          >
            Call
          </button>
        </div>
        <div className="col-4">
          <button
            className="action-btn ack-btn w-100"
            onClick={handleAcknowledge}
            disabled={ackDisabled}
          >
            Ack
          </button>
        </div>
        <div className="col-4">
          <button
            className="action-btn end-btn w-100"
            onClick={handleEnd}
            disabled={endDisabled}
          >
            End
          </button>
        </div>
      </div>

      {/* Token Stats Cards */}
      <div className="row gx-3 gy-3 d-flex flex-wrap mb-4">
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                Total
                <br />
                Tokens:
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">{totalTokens}</h1>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                OPR.
                <br />
                Current Token
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">
                {operatorToken}
              </h1>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                Current
                <br />
                Token:
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">{currentToken}</h1>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                Balance
                <br />
                Tokens:
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">
                {balanceTokens}
              </h1>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                Skipped
                <br />
                Tokens:
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">
                {skippedTokens}
              </h1>
            </div>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-sm-6">
          <div
            className="card custom-card-height"
            style={{ backgroundColor: '#d7ecfb' }}
          >
            <div className="card-body text-center px-0">
              <h4 className="text-black mb-2 font-w600 fs-5">
                Assigned
                <br />
                Tokens:
              </h4>
              <h1 className="text-black mb-2 font-w600 fs-2">
                {assignedTokens}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Token Log Table */}
      <div className="row">
        <div className="col-lg-12">
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm mb-0 table-striped dashboard-table">
                  <thead>
                    <tr>
                      <th>
                        <center>Token Id</center>
                      </th>
                      <th>
                        <center>Acknowledge Time</center>
                      </th>
                      <th>
                        <center>Time Taken</center>
                      </th>
                      {dashData.featureFlags.recallBtn && (
                        <th>
                          <center>ReCall</center>
                        </th>
                      )}
                      {dashData.featureFlags.reassignBtn && (
                        <th>
                          <center>ReAssign</center>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: 'center',
                            color: '#999',
                            padding: '20px',
                          }}
                        >
                          No token logs
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log, i) => {
                        const tokenDisplay = log.prefix + log.token_id;

                        const isPriority =
                          log.priority === true || log.priority === 'True';

                        const isSkipped =
                          log.ack_status === false &&
                          log.time_interval === null;

                        const isTokenIdRed =
                          log.prefix !== currentPrefixState ||
                          (log.reassign_dep === log.dep &&
                            log.reassign_active === true);

                        const rowStyle = isPriority
                          ? {
                              color: '#ff0000',
                              fontWeight: 'bold' as const,
                            }
                          : {};

                        return (
                          <tr key={i}>
                            <td
                              style={rowStyle}
                              className={isTokenIdRed ? 'skipped-token' : ''}
                            >
                              <center>{tokenDisplay}</center>
                            </td>

                            <td
                              style={rowStyle}
                              className={isSkipped ? 'skipped-token' : ''}
                            >
                              <center>
                                {isSkipped
                                  ? 'SKIPPED'
                                  : formatAckTime(log.ack_time)}
                              </center>
                            </td>

                            <td style={rowStyle}>
                              <center>
                                {isSkipped
                                  ? 'N/A'
                                  : formatTimeTaken(log.time_interval)}
                              </center>
                            </td>

                            {dashData.featureFlags.recallBtn && (
                              <td>
                                <center>
                                  <button
                                    className="table-action-btn recall-btn"
                                    disabled={
                                      log.reassign_active === true &&
                                      log.reassign_dep !== log.dep
                                    }
                                    onClick={() => handleRecall(log)}
                                  >
                                    ReCall
                                  </button>
                                </center>
                              </td>
                            )}

                            {dashData.featureFlags.reassignBtn && (
                              <td>
                                <center>
                                  <button
                                    className="table-action-btn reassign-btn"
                                    disabled={
                                      log.reassign_active === true &&
                                      log.reassign_dep !== log.dep
                                    }
                                    onClick={() => handleReassign(log)}
                                  >
                                    ReAssign
                                  </button>
                                </center>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <div id="pagination-controls" className="pagination">
                  <button
                    className="page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    &lt;
                  </button>
                  <span id="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="page-btn"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage >= totalPages}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTimeoutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              width: '430px',
              background: '#fff',
              borderRadius: '10px',
              padding: '30px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2
              style={{
                fontWeight: 700,
                marginBottom: '20px',
              }}
            >
              Time Expired!
            </h2>

            <p
              style={{
                color: '#777',
                marginBottom: '25px',
              }}
            >
              Time has expired! Please select an option below to extend the
              time:
            </p>

            <button
              style={{
                width: '100%',
                marginBottom: '12px',
                background: '#1976f3',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '5px',
                fontSize: '18px',
              }}
              onClick={() => addExtraTime(30)}
            >
              Add 30 seconds
            </button>

            <button
              style={{
                width: '100%',
                marginBottom: '12px',
                background: '#1976f3',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '5px',
                fontSize: '18px',
              }}
              onClick={() => addExtraTime(60)}
            >
              Add 60 seconds
            </button>

            <button
              style={{
                width: '100%',
                background: '#1976f3',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '5px',
                fontSize: '18px',
              }}
              onClick={handleEnd}
            >
              END
            </button>
          </div>
        </div>
      )}

      {/* ─── REASSIGN MODAL ─── */}
      {showReassignModal && reassignLog && (
        <div className="reassign-modal-overlay">
          <div className="reassign-modal">
            <div className="reassign-modal-header">
              <h3>Re-Assign</h3>
              <button
                className="reassign-modal-close"
                onClick={() => setShowReassignModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="reassign-modal-body">
              <div className="reassign-info-row">
                Token No.:{' '}
                <span>
                  {reassignLog.prefix}
                  {reassignLog.token_id}
                </span>
              </div>
              <div className="reassign-info-row">
                ReAssign From : <span>{user?.department}</span>
              </div>
              <div className="reassign-info-row">
                <label className="reassign-label">ReAssign to :</label>
                <select
                  className="reassign-select"
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {dashData?.departments
                    .filter((d) => d.department !== user?.department)
                    .map((d) => (
                      <option key={d.id} value={d.department}>
                        {d.department}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="reassign-modal-footer">
              <button
                className="reassign-confirm-btn"
                onClick={handleConfirmReassignClick}
                disabled={!targetDept}
              >
                Re-Assign
              </button>
              <button
                className="reassign-cancel-btn"
                onClick={() => setShowReassignModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM REASSIGN MODAL ─── */}
      {showConfirmModal && reassignLog && (
        <div className="reassign-modal-overlay">
          <div className="reassign-modal">
            <div className="reassign-modal-header">
              <h3>Confirm Re-Assignment</h3>
              <button
                className="reassign-modal-close"
                onClick={() => setShowConfirmModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="reassign-modal-body text-center">
              <p
                style={{ fontSize: '1.1rem', color: '#444', lineHeight: '1.5' }}
              >
                Are you sure you want to re-assign this Token{' '}
                <strong>
                  {reassignLog.prefix}
                  {reassignLog.token_id}
                </strong>{' '}
                From Department : <strong>{user?.department}</strong> To
                Department : <strong>{targetDept}</strong>?
              </p>
            </div>
            <div className="reassign-modal-footer">
              <button
                className="reassign-confirm-btn"
                onClick={confirmReassign}
                style={{ backgroundColor: '#4caf50' }}
              >
                Yes
              </button>
              <button
                className="reassign-cancel-btn"
                onClick={() => setShowConfirmModal(false)}
                style={{ backgroundColor: '#f44336' }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
