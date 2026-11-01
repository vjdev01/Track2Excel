import { useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { INTENTS, OUTCOME_PRIORITIES, PRIORITY_LABELS, OUTCOME_PERIODS, OUTCOME_STATUSES, alignmentGroups, linkedOutcomeIds, outcomeIntent, outcomesForPeriod, parentCandidates, periodBounds, saveOutcome } from './outcomes';
import type { AlignedActivity, IntentId, Outcome, OutcomeLimits, OutcomePeriod, OutcomePriority } from './outcomes';

export function IntentSelect({ value, inherited, onChange, id }: {
  value?: IntentId;
  inherited?: IntentId;
  onChange: (value: IntentId | undefined) => void;
  id?: string;
}) {
  return <select id={id} aria-label={inherited ? 'Intent (inherited)' : 'Intent'} value={inherited || value || ''} disabled={!!inherited} onChange={event => onChange((event.target.value || undefined) as IntentId | undefined)}>
    <option value="">No intent</option>
    {INTENTS.map(intent => <option key={intent.id} value={intent.id}>{intent.name} ({intent.purpose})</option>)}
  </select>;
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
  activities: AlignedActivity[];
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
  const [intentId, setIntentId] = useState<IntentId | undefined>();
  const [priority, setPriority] = useState<OutcomePriority | undefined>();
  const [notes, setNotes] = useState('');
  const [view, setView] = useState<'plan' | 'alignment'>('plan');
  const [error, setError] = useState('');
  const visible = outcomesForPeriod(outcomes, period, planDate);
  const parents = parentCandidates(outcomes, period, planDate);
  const bounds = periodBounds(period, planDate);
  const limit = limits[period];
  const inheritedIntent = outcomeIntent(outcomes, parentId);

  function resetEditor() {
    setEditing(null);
    setTitle('');
    setParentId('');
    setIntentId(undefined);
    setPriority(undefined);
    setNotes('');
    setError('');
  }

  return (
    <section className="outcomes-section">
      <h2>Outcomes</h2>
      <div className="outcome-views" role="group" aria-label="Outcomes view">
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Plan</button>
        <button type="button" aria-pressed={view === 'alignment'} onClick={() => setView('alignment')}>Alignment</button>
      </div>
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
      {view === 'plan' && <><form className="outcome-editor" onSubmit={event => {
        event.preventDefault();
        try {
          const saved = onChange(saveOutcome(outcomes, {
            id: editing?.id || crypto.randomUUID(), title, period, date: bounds.start,
            status: editing?.status || 'planned', parentId: parentId || undefined,
            intentId: inheritedIntent ? undefined : intentId, priority, notes,
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
        <label htmlFor="outcome-intent">{inheritedIntent ? 'Intent (inherited from parent)' : 'Intent (optional)'}</label>
        <IntentSelect id="outcome-intent" value={intentId} inherited={inheritedIntent} onChange={setIntentId} />
        <label htmlFor="outcome-priority">Priority (optional)</label>
        <select id="outcome-priority" value={priority || ''} onChange={event => setPriority((event.target.value || undefined) as OutcomePriority | undefined)}>
          <option value="">No priority</option>
          {OUTCOME_PRIORITIES.map(value => <option key={value} value={value}>{value} - {PRIORITY_LABELS[value]}</option>)}
        </select>
        <label htmlFor="outcome-notes">Notes (optional)</label>
        <textarea id="outcome-notes" rows={3} value={notes} onChange={event => setNotes(event.target.value)} />
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
          const intent = INTENTS.find(item => item.id === outcomeIntent(outcomes, outcome.id));
          return (
            <article className="outcome-item" key={outcome.id}>
              <div className="outcome-item-heading">
                <h3>{outcome.title}</h3>
                {outcome.priority && <span className={`outcome-priority ${outcome.priority}`} title={PRIORITY_LABELS[outcome.priority]}>{outcome.priority}</span>}
                <button type="button" aria-label={`Edit ${outcome.title}`} title="Edit outcome" onClick={() => { setEditing(outcome); setTitle(outcome.title); setParentId(outcome.parentId || ''); setIntentId(outcome.intentId); setPriority(outcome.priority); setNotes(outcome.notes || ''); setError(''); }}><FaEdit /></button>
                <button type="button" aria-label={`Delete ${outcome.title}`} title="Delete outcome" onClick={() => {
                  if (window.confirm(`Delete "${outcome.title}"? Activities and child outcomes will be kept, with their direct links removed.`)) {
                    onDelete(outcome.id);
                    if (editing?.id === outcome.id) resetEditor();
                    else if (parentId === outcome.id) setParentId('');
                  }
                }}><FaTrash /></button>
              </div>
              {parent && <p className="outcome-parent">Towards: {parent.title}</p>}
              {intent && <p className="outcome-intent">{intent.name}</p>}
              {outcome.notes && <details><summary>Notes</summary><p className="outcome-notes">{outcome.notes}</p></details>}
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
      </div></>}
      {view === 'alignment' && <div className="alignment-view">
        {alignmentGroups(outcomes, activities, period, planDate).map(group => {
          const intent = INTENTS.find(item => item.id === group.intentId);
          return <section className={`alignment-group ${group.intentId || 'unaligned'}`} key={group.intentId || 'unaligned'}>
            <h3>{intent?.name || 'Unaligned'}</h3>
            {intent && <p>{intent.purpose}</p>}
            <div className="alignment-summary"><span>{group.outcomes.length} planned</span><span>{group.achieved} achieved</span><span>{group.minutes} min invested</span></div>
            {group.outcomes.length > 0 && <ul>{group.outcomes.map(outcome => <li key={outcome.id}>{outcome.priority && <strong>{outcome.priority} </strong>}{outcome.title} <small>({outcome.status})</small></li>)}</ul>}
            <details><summary>{group.activities.length} activities</summary>
              {group.activities.length === 0 ? <p>No activities in this period.</p> : <ul>{group.activities.map(activity => <li key={activity.id}>{activity.date}: {activity.taskTitle || 'Untitled'} ({activity.endTime ? `${activity.duration || 0} min` : 'In progress'})</li>)}</ul>}
            </details>
          </section>;
        })}
      </div>}
    </section>
  );
}