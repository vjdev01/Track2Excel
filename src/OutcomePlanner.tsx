import { useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { OUTCOME_PERIODS, OUTCOME_STATUSES, linkedOutcomeIds, outcomesForPeriod, parentCandidates, periodBounds, saveOutcome } from './outcomes';
import type { Outcome, OutcomeLimits, OutcomePeriod } from './outcomes';

interface LinkedActivity {
  id: string;
  taskTitle?: string;
  date: string;
  endTime?: string;
  duration?: number;
  outcomeId?: string;
}

export function OutcomeSelect({ outcomes, value, date, onChange, id }: {
  outcomes: Outcome[];
  value?: string;
  date: string;
  onChange: (value: string | undefined) => void;
  id?: string;
}) {
  const available = outcomes.filter(outcome => {
    const bounds = periodBounds(outcome.period, outcome.date);
    return outcome.id === value || (bounds.start <= date && date < bounds.end);
  });
  return (
    <select id={id} aria-label="Outcome" value={value || ''} onChange={event => onChange(event.target.value || undefined)}>
      <option value="">No linked outcome</option>
      {available.map(outcome => <option key={outcome.id} value={outcome.id}>{outcome.period}: {outcome.title}</option>)}
    </select>
  );
}

export default function Outcomes({ outcomes, activities, date, limits, onChange, onDelete }: {
  outcomes: Outcome[];
  activities: LinkedActivity[];
  date: string;
  limits: OutcomeLimits;
  onChange: (outcomes: Outcome[]) => boolean;
  onDelete: (id: string) => void;
}) {
  const [period, setPeriod] = useState<OutcomePeriod>('daily');
  const [planDate, setPlanDate] = useState(date);
  const [editing, setEditing] = useState<Outcome | null>(null);
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');
  const visible = outcomesForPeriod(outcomes, period, planDate);
  const parents = parentCandidates(outcomes, period, planDate);
  const bounds = periodBounds(period, planDate);
  const limit = limits[period];

  function resetEditor() {
    setEditing(null);
    setTitle('');
    setParentId('');
    setError('');
  }

  return (
    <section className="outcomes-section">
      <h2>Outcomes</h2>
      <div className="outcome-periods" role="group" aria-label="Planning period">
        {OUTCOME_PERIODS.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => { setPeriod(value); resetEditor(); }}>{value}</button>)}
      </div>
      <label className="outcome-date">Planning date
        <input type="date" value={planDate} onChange={event => { if (event.target.value) { setPlanDate(event.target.value); resetEditor(); } }} />
      </label>
      <div className="outcome-period-summary">
        <span>{period === 'daily' ? bounds.start : `${bounds.start} onwards`}</span>
        <span>{visible.filter(outcome => outcome.status === 'achieved').length} achieved / {visible.length} planned</span>
      </div>
      <form className="outcome-editor" onSubmit={event => {
        event.preventDefault();
        try {
          const saved = onChange(saveOutcome(outcomes, {
            id: editing?.id || crypto.randomUUID(), title, period, date: bounds.start,
            status: editing?.status || 'planned', parentId: parentId || undefined,
          }, limit));
          if (saved) resetEditor();
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save outcome.'); }
      }}>
        <label htmlFor="outcome-title">{editing ? 'Edit outcome' : visible.length >= limit ? `Outcome limit: ${limit}` : `Outcome ${visible.length + 1} of ${limit}`}</label>
        <input id="outcome-title" value={title} maxLength={200} required onChange={event => setTitle(event.target.value)} />
        {period !== 'yearly' && <>
          <label htmlFor="parent-outcome">Parent outcome (optional)</label>
          <select id="parent-outcome" value={parentId} onChange={event => setParentId(event.target.value)}>
            <option value="">No parent outcome</option>
            {parents.map(parent => <option key={parent.id} value={parent.id}>{parent.title}</option>)}
          </select>
        </>}
        <div className="outcome-editor-actions">
          <button type="submit" disabled={!editing && visible.length >= limit}>{editing ? <FaEdit /> : <FaPlus />} {editing ? 'Save outcome' : 'Add outcome'}</button>
          {editing && <button type="button" onClick={resetEditor}>Cancel</button>}
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
      {visible.length === 0 && <p className="empty-log">No outcomes planned for this period.</p>}
      <div className="outcome-list">
        {visible.map(outcome => {
          const ids = linkedOutcomeIds(outcomes, outcome.id);
          const linked = activities.filter(activity => activity.outcomeId && ids.has(activity.outcomeId));
          const minutes = linked.filter(activity => activity.endTime).reduce((total, activity) => total + (activity.duration || 0), 0);
          const parent = outcomes.find(item => item.id === outcome.parentId);
          return (
            <article className="outcome-item" key={outcome.id}>
              <div className="outcome-item-heading">
                <h3>{outcome.title}</h3>
                <button type="button" aria-label={`Edit ${outcome.title}`} title="Edit outcome" onClick={() => { setEditing(outcome); setTitle(outcome.title); setParentId(outcome.parentId || ''); setError(''); }}><FaEdit /></button>
                <button type="button" aria-label={`Delete ${outcome.title}`} title="Delete outcome" onClick={() => {
                  if (window.confirm(`Delete "${outcome.title}"? Activities and child outcomes will be kept, with their direct links removed.`)) {
                    onDelete(outcome.id);
                    if (editing?.id === outcome.id) resetEditor();
                    else if (parentId === outcome.id) setParentId('');
                  }
                }}><FaTrash /></button>
              </div>
              {parent && <p className="outcome-parent">Towards: {parent.title}</p>}
              <label>Status
                <select aria-label={`Status for ${outcome.title}`} value={outcome.status} onChange={event => onChange(outcomes.map(item => item.id === outcome.id ? { ...item, status: event.target.value as Outcome['status'] } : item))}>
                  {OUTCOME_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <details>
                <summary>{linked.length} linked activities / {minutes} min</summary>
                {linked.length === 0 ? <p>No linked activities.</p> : <ul>{linked.map(activity => <li key={activity.id}>{activity.date}: {activity.taskTitle || 'Untitled'} ({activity.endTime ? `${activity.duration || 0} min` : 'In progress'})</li>)}</ul>}
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}