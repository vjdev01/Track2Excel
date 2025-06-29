import React from 'react';
import {useState, useEffect } from 'react';
import './App.css';
import { FaEdit } from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';

// Types
const ACTIVITY_TYPES = ['Value', 'Incidental', 'Waste'] as const;
const WELLBEING_AREAS = [
  'Physical', 'Mental', 'Financial', 'Family', 'Professional', 'Social',
] as const;
const TASK_SUGGESTIONS = [
  'Eating', 'Exercising', 'Cooking', 'Coding', 'Email', 'Shopping', 'FB', 'Insta', 'Twitter', 'Whatsapp', 'TV', 'Reading', 'Researching', 'Planning', 'Grooming', 'Cleaning', 'Meeting',
];

type ActivityType = typeof ACTIVITY_TYPES[number];
type WellbeingArea = typeof WELLBEING_AREAS[number];

interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime?: string; // ISO
  duration?: number; // in minutes
  activityType: ActivityType;
  wellbeingArea: WellbeingArea;
  taskTitle?: string;
  effortRating?: number;
  notes?: string;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// Helper: get local date in yyyy-MM-dd
function getLocalToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tzOffset = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number) {
  return `${Math.round(ms / 60000)} min`;
}

// Helper: format date to yyyy-MM-ddTHH:mm for local time
function toLocalInputValue(dateStr: string) {
  const d = new Date(dateStr);
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

// Helper: get local date in yyyy-MM-dd from a Date or string
function toLocalDateString(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  d.setHours(0, 0, 0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}

// Helper: format date as 'Jun-23' for chart x-axis
function formatChartDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit' }).replace(',', '').replace(/^([A-Za-z]+) (\d{2})$/, '$1-$2');
}

// Helper: get minutes between two times (HH:mm)
function getMinutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
// Helper: get minutes since start of tracking period today
function getMinutesSinceTrackingStart(trackingStart: string) {
  const now = new Date();
  const [sh, sm] = trackingStart.split(':').map(Number);
  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
}
// Helper: get minutes remaining in tracking period today
function getMinutesRemaining(trackingEnd: string) {
  const now = new Date();
  const [eh, em] = trackingEnd.split(':').map(Number);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
}

const DEFAULT_TRACK_START = '09:00';
const DEFAULT_TRACK_END = '18:00';

const App: React.FC = () => {
  // State
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editEndTimeActivity, setEditEndTimeActivity] = useState<Activity | null>(null);
  const [tab, setTab] = useState<'tracking' | 'analysis' | 'settings'>('tracking');
  const [lastExport, setLastExport] = useState<string | null>(localStorage.getItem('lastExport'));
  const [trackStart, setTrackStart] = useState<string>(() => localStorage.getItem('trackStart') || DEFAULT_TRACK_START);
  const [trackEnd, setTrackEnd] = useState<string>(() => localStorage.getItem('trackEnd') || DEFAULT_TRACK_END);
  // Add state and handler for import result and CSV import
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load activities from localStorage (fix: parse as Activity[])
  useEffect(() => {
    const data = localStorage.getItem('activities');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setActivities(parsed);
        }
      } catch {
        setActivities([]);
      }
    }
  }, []);

  // Save activities to localStorage (fix: only if not empty)
  useEffect(() => {
    if (activities.length > 0) {
      localStorage.setItem('activities', JSON.stringify(activities));
    } else {
      localStorage.removeItem('activities');
    }
  }, [activities]);

  // Persist tracking period start/end to localStorage
  useEffect(() => {
    localStorage.setItem('trackStart', trackStart);
  }, [trackStart]);
  useEffect(() => {
    localStorage.setItem('trackEnd', trackEnd);
  }, [trackEnd]);

  // Timer effect
  useEffect(() => {
    if (activeActivity && !activeActivity.endTime) {
      const interval = setInterval(() => {
        setTimer(Date.now() - new Date(activeActivity.startTime).getTime());
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      setTimer(0);
      if (timerInterval) clearInterval(timerInterval);
    }
  }, [activeActivity]);

  // Date activities
  const activitiesForDate = activities
    .filter((a: any) => a.date === selectedDate)
    .sort((a: any, b: any) => (b.startTime.localeCompare(a.startTime)));

  // Helper: is selected date today?
  const isToday = selectedDate === getLocalToday();

  // Handlers
  const handleStartActivity = () => setShowStartModal(true);
  const handleStopActivity = () => setShowStopModal(true);

  // Export to CSV
  const handleExportCSV = () => {
    const header = [
      'Task Title', 'Start Time', 'End Time', 'Duration (min)', 'Activity Type', 'Well-being Area', 'Effort Rating', 'Notes', 'Date'
    ];
    const rows = activities.map(a => [
      a.taskTitle || '',
      a.startTime ? new Date(a.startTime).toLocaleString() : '',
      a.endTime ? new Date(a.endTime).toLocaleString() : '',
      a.duration ?? '',
      a.activityType,
      a.wellbeingArea,
      a.effortRating ?? '',
      a.notes ? '"' + a.notes.replace(/"/g, '""') + '"' : '',
      a.date
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(field => (typeof field === 'string' && field.includes(',') ? '"' + field + '"' : field)).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${getToday()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const now = new Date().toLocaleString();
    setLastExport(now);
    localStorage.setItem('lastExport', now);
  };

  // Helper: get activities in date range
  function getActivitiesInRange(start: string, end: string) {
    return activities.filter(a => a.date >= start && a.date <= end && a.endTime);
  }
  // Helper: get last N days (local)
  function getLastNDates(n: number) {
    const arr = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(toLocalDateString(d));
    }
    return arr;
  }
  // Analysis state
  const [analysisRange, setAnalysisRange] = useState<{start: string, end: string}>(() => {
    const dates = getLastNDates(7);
    return { start: dates[0], end: dates[dates.length - 1] };
  });
  const analysisDates = getLastNDates(
    Math.min(10, Math.ceil((new Date(analysisRange.end).getTime() - new Date(analysisRange.start).getTime()) / 86400000) + 1)
  ).filter(d => d >= analysisRange.start && d <= analysisRange.end);
  const analysisActivities = getActivitiesInRange(analysisRange.start, analysisRange.end);
  // Chart data: Activity Type
  const activityTypeData = analysisDates.map(date => {
    const dayActs = analysisActivities.filter(a => a.date === date);
    const result: any = { date };
    ACTIVITY_TYPES.forEach(type => {
      result[type] = dayActs.filter(a => a.activityType === type)
        .reduce((sum, a) => sum + (a.duration || 0), 0);
    });
    return result;
  });
  // Chart data: Well-being Area
  const wellbeingData = analysisDates.map(date => {
    const dayActs = analysisActivities.filter(a => a.date === date);
    const result: any = { date };
    WELLBEING_AREAS.forEach(area => {
      result[area] = dayActs.filter(a => a.wellbeingArea === area)
        .reduce((sum, a) => sum + (a.duration || 0), 0);
    });
    return result;
  });
  // Chart data: Effort Rating
  const effortData = analysisDates.map(date => {
    const dayActs = analysisActivities.filter(a => a.date === date);
    return {
      date,
      Effort: dayActs.reduce((sum, a) => sum + (a.effortRating || 0), 0)
    };
  });

  // Tracking period calculations
  const totalTrackMinutes = getMinutesBetween(trackStart, trackEnd);
  let elapsed = totalTrackMinutes;
  let remaining = 0;
  let tracked = 0;
  if (isToday) {
    const now = new Date();
    const [sh, sm] = trackStart.split(':').map(Number);
    const [eh, em] = trackEnd.split(':').map(Number);
    const start = new Date(now); start.setHours(sh, sm, 0, 0);
    const end = new Date(now); end.setHours(eh, em, 0, 0);
    elapsed = Math.max(0, Math.min(totalTrackMinutes, Math.floor((now.getTime() - start.getTime()) / 60000)));
    remaining = Math.max(0, Math.min(totalTrackMinutes - elapsed, Math.floor((end.getTime() - now.getTime()) / 60000)));
    tracked = activitiesForDate.filter(a => a.endTime && new Date(a.startTime) >= start && new Date(a.endTime) <= end)
      .reduce((sum, a) => sum + (a.duration || 0), 0);
  } else {
    // For past days, show full period and tracked for that day
    tracked = activitiesForDate.filter(a => a.endTime)
      .reduce((sum, a) => sum + (a.duration || 0), 0);
    elapsed = totalTrackMinutes;
    remaining = 0;
  }
  const trackedPct = Math.max(0, Math.min(1, tracked / totalTrackMinutes));
  const elapsedPct = isToday ? Math.max(0, Math.min(1, elapsed / totalTrackMinutes)) : 1;
  const redPct = isToday ? Math.max(0, Math.min(1, elapsedPct - trackedPct)) : 1 - trackedPct;
  const greenPct = trackedPct;
  const grayPct = isToday ? 1 - elapsedPct : 0;

  // Add import handler
  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV missing data rows.');
        const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const expected = ['Task Title','Start Time','End Time','Duration (min)','Activity Type','Well-being Area','Effort Rating','Notes','Date'];
        if (header.length !== expected.length || !header.every((h, i) => h === expected[i])) {
          throw new Error('CSV schema does not match expected format.');
        }
        const imported: Activity[] = [];
        for (let i = 1; i < lines.length; ++i) {
          const row = lines[i];
          if (!row.trim()) continue;
          // Handle quoted fields and commas
          const fields = row.match(/("[^"]*"|[^,]*)/g)?.map(f => f.replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
          if (fields.length !== expected.length) continue;
          imported.push({
            id: Math.random().toString(36).slice(2),
            taskTitle: fields[0] || undefined,
            startTime: new Date(fields[1]).toISOString(),
            endTime: fields[2] ? new Date(fields[2]).toISOString() : undefined,
            duration: fields[3] ? Number(fields[3]) : undefined,
            activityType: fields[4] as ActivityType,
            wellbeingArea: fields[5] as WellbeingArea,
            effortRating: fields[6] ? Number(fields[6]) : undefined,
            notes: fields[7] || undefined,
            date: toLocalDateString(fields[1]), // Use local date from startTime
          });
        }
        if (imported.length === 0) throw new Error('No valid records found in CSV.');
        setActivities(prev => [...prev, ...imported]);
        setImportResult({ success: true, message: `${imported.length} activities imported successfully.` });
      } catch (err: any) {
        setImportResult({ success: false, message: err.message || 'Import failed.' });
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="tracker-container fixed-viewport">
      {/* Tabs */}
      <div className="tabs tab-bar">
        <button className={tab === 'tracking' ? 'tab active' : 'tab'} onClick={() => setTab('tracking')}>Tracking</button>
        <button className={tab === 'analysis' ? 'tab active' : 'tab'} onClick={() => setTab('analysis')}>Analysis</button>
        <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>Settings</button>
      </div>
      {tab === 'tracking' && (
        <div className="tracking-tab-content">
          {/* Date Selector */}
          <div className="date-selector">
            <input
              type="date"
              value={selectedDate}
              max={getLocalToday()}
              onChange={e => setSelectedDate(e.target.value)}
            />
            <span className="today-label">{isToday ? "Today" : selectedDate}</span>
          </div>
          {/* Activity Controls (only for today) */}
          {isToday && (
            <div className="activity-controls">
              <button
                className="start-btn"
                onClick={handleStartActivity}
                disabled={!!activeActivity && !activeActivity.endTime}
              >
                Start Activity
              </button>
              <span className="timer-display">
                {activeActivity && !activeActivity.endTime
                  ? formatDuration(timer)
                  : '--:--'}
              </span>
              <button
                className="stop-btn"
                onClick={handleStopActivity}
                disabled={!activeActivity || !!activeActivity.endTime}
              >
                Stop Activity
              </button>
            </div>
          )}
          {/* Tracking period bar */}
          <div className="tracking-bar-container">
            <div className="tracking-bar-labels">
              <span>{trackStart}</span>
              <span>{trackEnd}</span>
            </div>
            <div
              className="tracking-bar"
              tabIndex={0}
              aria-label="Tracking period bar"
            >
              <div className="bar-green" style={{ width: `${greenPct * 100}%` }} />
              <div className="bar-red" style={{ width: `${redPct * 100}%` }} />
              <div className="bar-gray" style={{ width: `${grayPct * 100}%` }} />
              <div className="tracking-bar-tooltip">
                <span><strong>{tracked} min</strong> tracked (green)</span><br />
                <span><strong>{elapsed - tracked} min</strong> untracked (red)</span><br />
                <span><strong>{totalTrackMinutes - elapsed} min</strong> remaining (gray)</span><br />
                <span>Total: <strong>{totalTrackMinutes} min</strong></span>
              </div>
            </div>
            <div className="tracking-bar-info">
              <span>{tracked} min tracked</span>
              <span>{elapsed} min elapsed</span>
              <span>{totalTrackMinutes} min total</span>
            </div>
          </div>
          {/* Activity Log */}
          <div className="activity-log">
            <h2>Activity Log</h2>
            {activitiesForDate.length === 0 ? (
              <div className="empty-log">No activities recorded for this date.</div>
            ) : (
              <div>
                {activitiesForDate.map(a => (
                  <div key={a.id} className="activity-entry">
                    <div className="task-title">{a.taskTitle || <em>Untitled</em>}
                      {a.endTime && (
                        <span className="edit-icon" title="Edit Activity" onClick={() => setEditActivity(a)}>
                          <FaEdit />
                        </span>
                      )}
                      {!a.endTime && (
                        <span className="edit-icon" title="Set End Time" onClick={() => setEditEndTimeActivity(a)}>
                          <FaEdit />
                        </span>
                      )}
                    </div>
                    <div className="activity-meta">
                      {formatTime(a.startTime)}
                      {' - '}
                      {a.endTime ? formatTime(a.endTime) : <span className="in-progress">In Progress</span>}
                      {' ('}
                      {a.endTime ? formatDuration(new Date(a.endTime).getTime() - new Date(a.startTime).getTime()) : '--'}
                      {')'}
                    </div>
                    <div className="activity-tags">
                      <span className="tag type">{a.activityType}</span>
                      <span className="tag area">{a.wellbeingArea}</span>
                    </div>
                    {a.effortRating !== undefined && (
                      <div className="effort-rating">Effort: {a.effortRating}/10</div>
                    )}
                    {a.notes && <div className="notes">Notes: {a.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'analysis' && (
        <div className="analysis-section">
          <div className="analysis-controls">
            <label>Date Range: </label>
            <input
              type="date"
              value={analysisRange.start}
              max={getLocalToday()}
              onChange={e => {
                let val = toLocalDateString(e.target.value);
                if (val > analysisRange.end) val = analysisRange.end;
                // Limit to 10 days
                const maxStart = new Date(analysisRange.end);
                maxStart.setDate(maxStart.getDate() - 9);
                if (val < toLocalDateString(maxStart)) val = toLocalDateString(maxStart);
                setAnalysisRange(r => ({ ...r, start: val }));
              }}
            />
            <span>to</span>
            <input
              type="date"
              value={analysisRange.end}
              max={getLocalToday()}
              min={analysisRange.start}
              onChange={e => {
                let val = toLocalDateString(e.target.value);
                // Limit to 10 days
                const minEnd = new Date(analysisRange.start);
                minEnd.setDate(minEnd.getDate() + 9);
                if (val > toLocalDateString(minEnd)) val = toLocalDateString(minEnd);
                setAnalysisRange(r => ({ ...r, end: val }));
              }}
            />
          </div>
          <div className="chart-section">
            <h3>Time spent by Activity type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityTypeData} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={formatChartDate} />
                <Legend />
                {ACTIVITY_TYPES.map(type => (
                  <Bar key={type} dataKey={type} stackId="a" fill={type === 'Value' ? '#43a047' : type === 'Incidental' ? '#ffa726' : '#e53935'} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-section">
            <h3>Time spent by Well-being area</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wellbeingData} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={formatChartDate} />
                <Legend />
                {WELLBEING_AREAS.map(area => (
                  <Bar key={area} dataKey={area} stackId="a" fill={WELLBEING_COLORS[area]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-section">
            <h3>Effort rating</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={effortData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} />
                <YAxis label={{ value: 'Effort', angle: -90, position: 'insideLeft' }} />
                <Tooltip labelFormatter={formatChartDate} />
                <Bar dataKey="Effort" fill="#fbc02d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {tab === 'settings' && (
        <div className="settings-section">
          <div className="settings-row settings-row-tight">
            <div className="settings-label">
              <strong>Activities to export:</strong> {activities.length}
            </div>
            <button className="export-btn" onClick={handleExportCSV}>Export CSV</button>
          </div>
          <div className="settings-row settings-row-tight last-export-row">
            <span><strong>Last export:</strong> {lastExport ? lastExport : 'Never'}</span>
          </div>
          <div className="settings-row import-row">
            <input
              type="file"
              accept=".csv"
              id="import-csv-input"
              style={{ display: 'none' }}
              onChange={handleImportCSV}
            />
            <button className="import-btn" onClick={() => document.getElementById('import-csv-input')?.click()}>
              Import CSV
            </button>
            {importResult && (
              <span className={importResult.success ? 'import-success' : 'import-error'}>{importResult.message}</span>
            )}
          </div>
          <div className="settings-row tracking-period-settings">
            <label><strong>Tracking Period:</strong></label>
            <input type="time" value={trackStart} onChange={e => setTrackStart(e.target.value)} />
            <span>to</span>
            <input type="time" value={trackEnd} onChange={e => setTrackEnd(e.target.value)} />
            <span className="tracking-period-desc">(Default: 09:00 to 18:00)</span>
          </div>
        </div>
      )}
      {/* Modals */}
      {showStartModal && (
        <StartActivityModal
          onStart={activity => {
            setActiveActivity(activity);
            setActivities([...activities, activity]);
            setShowStartModal(false);
          }}
          onCancel={() => setShowStartModal(false)}
        />
      )}
      {showStopModal && activeActivity && !activeActivity.endTime && (
        <StopActivityModal
          activity={activeActivity}
          onStop={(updates) => {
            const endTime = new Date().toISOString();
            const updated = { ...activeActivity, ...updates, endTime };
            updated.duration = Math.round((new Date(endTime).getTime() - new Date(activeActivity.startTime).getTime()) / 60000);
            setActivities(acts => acts.map(a => a.id === updated.id ? updated : a));
            setActiveActivity(null);
            setShowStopModal(false);
          }}
          onCancel={() => setShowStopModal(false)}
        />
      )}
      {editActivity && (
        <EditActivityModal
          activity={editActivity}
          onSave={updated => {
            setActivities(acts => acts.map(a => a.id === updated.id ? { ...a, ...updated } : a));
            setEditActivity(null);
          }}
          onCancel={() => setEditActivity(null)}
        />
      )}
      {editEndTimeActivity && (
        <EditEndTimeModal
          activity={editEndTimeActivity}
          onSave={({ endTime }) => {
            // Save endTime and duration
            const isoEnd = new Date(endTime).toISOString();
            setActivities(acts => acts.map(a =>
              a.id === editEndTimeActivity.id
                ? { ...a, endTime: isoEnd, duration: Math.round((new Date(isoEnd).getTime() - new Date(a.startTime).getTime()) / 60000) }
                : a
            ));
            setEditEndTimeActivity(null);
          }}
          onCancel={() => setEditEndTimeActivity(null)}
        />
      )}
    </div>
  );
};

// Start Activity Modal
const StartActivityModal: React.FC<{
  onStart: (activity: Activity) => void;
  onCancel: () => void;
}> = ({ onStart, onCancel }) => {
  const [activityType, setActivityType] = useState<ActivityType>('Value');
  const [wellbeingArea, setWellbeingArea] = useState<WellbeingArea>('Physical');
  const [taskTitle, setTaskTitle] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (taskTitle.length > 0) {
      setSuggestions(TASK_SUGGESTIONS.filter(s => s.toLowerCase().includes(taskTitle.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  }, [taskTitle]);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Start Activity</h3>
        <div className="modal-content">
          <label>Activity Type:</label>
          <select value={activityType} onChange={e => setActivityType(e.target.value as ActivityType)}>
            {ACTIVITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <label>Well-being Area:</label>
          <select value={wellbeingArea} onChange={e => setWellbeingArea(e.target.value as WellbeingArea)}>
            {WELLBEING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <label>Task Title (optional):</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            list="task-suggestions"
            placeholder="e.g. Eating, Shopping..."
          />
          <datalist id="task-suggestions">
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="modal-actions">
          <button className="start-btn" onClick={() => onStart({
            id: Math.random().toString(36).slice(2),
            date: getLocalToday(), // Use local date
            startTime: new Date().toISOString(),
            activityType,
            wellbeingArea,
            taskTitle: taskTitle.trim() || undefined,
          } as Activity)}>
            Start Timer
          </button>
          <button className="cancel-btn" onClick={onCancel}>Cancel Activity</button>
        </div>
      </div>
    </div>
  );
};

// Stop Activity Modal
const StopActivityModal: React.FC<{
  activity: Activity;
  onStop: (updates: Partial<Activity>) => void;
  onCancel: () => void;
}> = ({ activity, onStop, onCancel }) => {
  const [taskTitle, setTaskTitle] = useState(activity.taskTitle || '');
  const [effortRating, setEffortRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Stop Activity</h3>
        <div className="modal-content">
          <label>Task Title (optional):</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="e.g. Eating, Shopping..."
          />
          <label>
            Effort Rating (0-10):
            <span
              className="tooltip-icon"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              ⓘ
              {showTooltip && (
                <span className="tooltip-text">
                  On a scale of 0-10, how well did I make the best use of my energy & intellect to show exceptional care, minimize risks, maximize opportunity while staying calm & focused on creating a memorable positive experience based on things I control?
                </span>
              )}
            </span>
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={effortRating ?? ''}
            onChange={e => setEffortRating(Number(e.target.value))}
          />
          <label>Notes (optional):</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the outcome or experience..."
          />
        </div>
        <div className="modal-actions">
          <button className="stop-btn" onClick={() => onStop({
            taskTitle: taskTitle.trim() || undefined,
            effortRating,
            notes: notes.trim() || undefined,
          })}>
            Stop Timer
          </button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Edit Activity Modal
const EditActivityModal: React.FC<{
  activity: Activity;
  onSave: (updated: Partial<Activity> & { id: string }) => void;
  onCancel: () => void;
}> = ({ activity, onSave, onCancel }) => {
  const [activityType, setActivityType] = useState<ActivityType>(activity.activityType);
  const [wellbeingArea, setWellbeingArea] = useState<WellbeingArea>(activity.wellbeingArea);
  const [taskTitle, setTaskTitle] = useState(activity.taskTitle || '');
  const [notes, setNotes] = useState(activity.notes || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(() => toLocalInputValue(activity.startTime));
  const [endTime, setEndTime] = useState(() => activity.endTime ? toLocalInputValue(activity.endTime) : '');

  useEffect(() => {
    if (taskTitle.length > 0) {
      setSuggestions(TASK_SUGGESTIONS.filter(s => s.toLowerCase().includes(taskTitle.toLowerCase())));
    } else {
      setSuggestions([]);
    }
  }, [taskTitle]);

  // Ensure endTime is not before startTime
  useEffect(() => {
    if (endTime && endTime < startTime) {
      setEndTime(startTime);
    }
  }, [startTime]);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Activity</h3>
        <div className="modal-content">
          <label>Activity Type:</label>
          <select value={activityType} onChange={e => setActivityType(e.target.value as ActivityType)}>
            {ACTIVITY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <label>Well-being Area:</label>
          <select value={wellbeingArea} onChange={e => setWellbeingArea(e.target.value as WellbeingArea)}>
            {WELLBEING_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <label>Task Title (optional):</label>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            list="task-suggestions-edit"
            placeholder="e.g. Eating, Shopping..."
          />
          <datalist id="task-suggestions-edit">
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
          <label>Start Time:</label>
          <input
            type="datetime-local"
            value={startTime}
            max={endTime || undefined}
            onChange={e => setStartTime(e.target.value)}
          />
          <label>End Time (optional):</label>
          <input
            type="datetime-local"
            value={endTime}
            min={startTime}
            onChange={e => setEndTime(e.target.value)}
          />
          <label>Notes (optional):</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe the outcome or experience..."
          />
        </div>
        <div className="modal-actions">
          <button className="start-btn" onClick={() => {
            // Convert local datetime-local values to ISO strings
            const newStart = new Date(startTime).toISOString();
            const newEnd = endTime ? new Date(endTime).toISOString() : undefined;
            onSave({
              id: activity.id,
              activityType,
              wellbeingArea,
              taskTitle: taskTitle.trim() || undefined,
              notes: notes.trim() || undefined,
              startTime: newStart,
              endTime: newEnd,
              duration: newEnd ? Math.round((new Date(newEnd).getTime() - new Date(newStart).getTime()) / 60000) : undefined,
            });
          }}>Save</button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Edit End Time Modal
const EditEndTimeModal: React.FC<{
  activity: Activity;
  onSave: (updates: { endTime: string }) => void;
  onCancel: () => void;
}> = ({ activity, onSave, onCancel }) => {
  // Default to now, but not before startTime, in local time
  const now = new Date();
  const minDate = new Date(activity.startTime);
  const [endTime, setEndTime] = useState(() => {
    const localNow = toLocalInputValue(now.toISOString());
    const localMin = toLocalInputValue(minDate.toISOString());
    return localNow < localMin ? localMin : localNow;
  });
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Set End Time</h3>
        <div className="modal-content">
          <label>End Time:</label>
          <input
            type="datetime-local"
            min={toLocalInputValue(activity.startTime)}
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="start-btn" onClick={() => {
            // Convert local datetime-local value to ISO string in UTC
            const local = new Date(endTime);
            onSave({ endTime: local.toISOString() });
          }}>Save</button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Well-being area colors (try to use meaningful associations)
const WELLBEING_COLORS: Record<WellbeingArea, string> = {
  Physical: '#e53935',      // Red (blood/energy)
  Mental: '#8e24aa',        // Purple (mind/creativity)
  Financial: '#43a047',     // Green (money)
  Family: '#039be5',        // Light Blue (caring, harmony, distinct from Professional)
  Professional: '#1976d2',  // Blue (trust/professional)
  Social: '#f06292',        // Pink (friendship, connection, high contrast)
};

export default App;
