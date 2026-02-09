import { useState, useMemo, useCallback } from 'react';
import type { AVPosition, Brother } from '../types';
import { getEligibleBrothers } from '../lib/eligibility';

/** Position display order and labels */
const positionOrder: AVPosition[] = [
  'audio',
  'video',
  'avAssistant',
  'rightMic',
  'leftMic',
  'frontStage',
  'auditorium',
  'entrance1',
  'entrance2',
];

const positionLabels: Record<AVPosition, string> = {
  audio: 'Audio',
  video: 'Video',
  avAssistant: 'A/V Assistant',
  rightMic: 'Right Mic',
  leftMic: 'Left Mic',
  frontStage: 'Front/Stage',
  auditorium: 'Auditorium',
  entrance1: 'Entrance 1',
  entrance2: 'Entrance 2',
};

/** Serialized week data passed from Astro frontmatter */
export interface EditorWeek {
  weekOf: string;
  midweekDate: string;
  weekendDate: string;
  assignments: Record<AVPosition, string | null>;
  unavailable: {
    noAV: string[]; // brother IDs (resolved from PDF names at build time)
    noMic: string[]; // brother IDs
  };
  noMeeting?: boolean;
  weekendOnly?: boolean;
  note?: string;
}

interface Props {
  weeks: EditorWeek[];
  brothers: Brother[];
  month: string;
  isDev?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function formatDateRange(midweekDate: string, weekendDate: string): string {
  const midweek = new Date(midweekDate + 'T00:00:00');
  const weekend = new Date(weekendDate + 'T00:00:00');
  const month = midweek.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${midweek.getDate()} & ${weekend.getDate()}`;
}

function formatBrotherName(brotherId: string | null): string {
  if (!brotherId) return '\u2014'; // em dash
  return brotherId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ScheduleEditor({
  weeks,
  brothers,
  month,
  isDev = false,
}: Props) {
  // State: one assignments record per week (keyed by weekOf)
  const [weekAssignments, setWeekAssignments] = useState<
    Record<string, Record<AVPosition, string | null>>
  >(() => {
    const init: Record<string, Record<AVPosition, string | null>> = {};
    for (const week of weeks) {
      init[week.weekOf] = { ...week.assignments };
    }
    return init;
  });

  // Track original values for dirty detection
  const [originalAssignments] = useState<
    Record<string, Record<AVPosition, string | null>>
  >(() => {
    const init: Record<string, Record<AVPosition, string | null>> = {};
    for (const week of weeks) {
      init[week.weekOf] = { ...week.assignments };
    }
    return init;
  });

  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    () => {
      const init: Record<string, SaveStatus> = {};
      for (const week of weeks) {
        init[week.weekOf] = 'idle';
      }
      return init;
    }
  );

  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // Check if a week has unsaved changes
  const isDirty = useCallback(
    (weekOf: string) => {
      const current = weekAssignments[weekOf];
      const original = originalAssignments[weekOf];
      if (!current || !original) return false;
      return positionOrder.some((pos) => current[pos] !== original[pos]);
    },
    [weekAssignments, originalAssignments]
  );

  // Check for duplicate assignments within a week
  const getDuplicates = useCallback(
    (weekOf: string): Set<string> => {
      const assignments = weekAssignments[weekOf];
      if (!assignments) return new Set();
      const seen = new Map<string, number>();
      const dupes = new Set<string>();
      for (const brotherId of Object.values(assignments)) {
        if (brotherId) {
          seen.set(brotherId, (seen.get(brotherId) || 0) + 1);
          if (seen.get(brotherId)! > 1) {
            dupes.add(brotherId);
          }
        }
      }
      return dupes;
    },
    [weekAssignments]
  );

  // Handle dropdown change
  const handleChange = useCallback(
    (weekOf: string, position: AVPosition, value: string) => {
      setWeekAssignments((prev) => ({
        ...prev,
        [weekOf]: {
          ...prev[weekOf],
          [position]: value || null,
        },
      }));
      // Reset save status when user makes a change
      setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'idle' }));
    },
    []
  );

  // Save a week's assignments
  const handleSave = useCallback(
    async (weekOf: string) => {
      setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'saving' }));
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[weekOf];
        return next;
      });

      try {
        const res = await fetch(`/api/schedule/${month}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekOf,
            assignments: weekAssignments[weekOf],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'saved' }));
        // Update original to current so dirty is cleared
        originalAssignments[weekOf] = { ...weekAssignments[weekOf] };
        // Reset to idle after 2s
        setTimeout(() => {
          setSaveStatuses((prev) =>
            prev[weekOf] === 'saved' ? { ...prev, [weekOf]: 'idle' } : prev
          );
        }, 2000);
      } catch (err) {
        setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'error' }));
        setSaveErrors((prev) => ({
          ...prev,
          [weekOf]: err instanceof Error ? err.message : 'Save failed',
        }));
      }
    },
    [month, weekAssignments, originalAssignments]
  );

  // Memoize the unavailability maps per week (from props, won't change)
  const unavailabilityMap = useMemo(() => {
    const map: Record<string, { noAV: string[]; noMic: string[] }> = {};
    for (const week of weeks) {
      map[week.weekOf] = week.unavailable;
    }
    return map;
  }, [weeks]);

  return (
    <div className="schedule-editor" style={styles.container}>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.positionHeader }}>
                Assignment
              </th>
              {weeks.map((week) => (
                <th
                  key={week.weekOf}
                  style={{ ...styles.th, ...styles.dateHeader }}
                >
                  {week.noMeeting ? (
                    <span style={styles.noMeetingHeader}>
                      {week.note || 'No Meeting'}
                    </span>
                  ) : (
                    <>
                      <span style={styles.dateRange}>
                        {formatDateRange(week.midweekDate, week.weekendDate)}
                      </span>
                      <span style={styles.days}>
                        {week.weekendOnly ? '(Sun only)' : '(Fri & Sun)'}
                      </span>
                      {week.note && (
                        <span style={styles.weekNote}>{week.note}</span>
                      )}
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positionOrder.map((position, idx) => {
              const isAlt = idx % 2 === 1;
              return (
                <tr key={position} style={isAlt ? styles.altRow : undefined}>
                  <td
                    style={{
                      ...styles.td,
                      ...styles.positionCell,
                      ...(isAlt ? styles.altPositionCell : {}),
                    }}
                  >
                    {positionLabels[position]}
                  </td>
                  {weeks.map((week) => {
                    if (week.noMeeting) {
                      return idx === 0 ? (
                        <td
                          key={week.weekOf}
                          rowSpan={positionOrder.length}
                          style={{ ...styles.td, ...styles.noMeetingCell }}
                        >
                          <span style={styles.noMeetingText}>
                            {week.note || 'No Meeting'}
                          </span>
                        </td>
                      ) : null;
                    }

                    const currentAssign =
                      weekAssignments[week.weekOf] || week.assignments;
                    const currentValue = currentAssign[position] || '';
                    const eligible = getEligibleBrothers(
                      position,
                      brothers,
                      unavailabilityMap[week.weekOf],
                      currentAssign,
                      position
                    );
                    const duplicates = getDuplicates(week.weekOf);
                    const hasDupe =
                      currentValue && duplicates.has(currentValue);
                    const isChanged =
                      currentValue !==
                      (originalAssignments[week.weekOf]?.[position] || '');

                    return (
                      <td
                        key={week.weekOf}
                        style={{
                          ...styles.td,
                          ...styles.assignmentCell,
                          ...(isChanged ? styles.dirtyCell : {}),
                        }}
                      >
                        <select
                          value={currentValue}
                          onChange={(e) =>
                            handleChange(week.weekOf, position, e.target.value)
                          }
                          style={{
                            ...styles.select,
                            ...(hasDupe ? styles.dupeSelect : {}),
                          }}
                          title={
                            hasDupe
                              ? 'Duplicate: this brother is assigned to multiple positions'
                              : undefined
                          }
                        >
                          <option value="">-- Unassigned --</option>
                          {eligible.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.fullName}
                            </option>
                          ))}
                          {/* Keep current value visible even if not eligible (manual override) */}
                          {currentValue &&
                            !eligible.some((b) => b.id === currentValue) && (
                              <option
                                value={currentValue}
                                style={{ color: '#ef4444' }}
                              >
                                {formatBrotherName(currentValue)} (ineligible)
                              </option>
                            )}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Save row */}
            <tr>
              <td style={{ ...styles.td, borderBottom: 'none' }}></td>
              {weeks.map((week) => {
                if (week.noMeeting) return null;
                const status = saveStatuses[week.weekOf] || 'idle';
                const dirty = isDirty(week.weekOf);
                const dupes = getDuplicates(week.weekOf);
                const error = saveErrors[week.weekOf];

                return (
                  <td
                    key={week.weekOf}
                    style={{ ...styles.td, ...styles.saveCell }}
                  >
                    {isDev && (
                      <button
                        onClick={() => handleSave(week.weekOf)}
                        disabled={status === 'saving' || !dirty}
                        style={{
                          ...styles.saveBtn,
                          ...(dirty ? styles.saveBtnDirty : {}),
                          ...(status === 'saving' ? styles.saveBtnSaving : {}),
                          ...(status === 'saved' ? styles.saveBtnSaved : {}),
                          ...(status === 'error' ? styles.saveBtnError : {}),
                        }}
                      >
                        {status === 'saving'
                          ? 'Saving...'
                          : status === 'saved'
                            ? 'Saved!'
                            : status === 'error'
                              ? 'Retry'
                              : 'Save'}
                      </button>
                    )}
                    {dupes.size > 0 && (
                      <div style={styles.dupeWarning}>
                        Duplicate assignments
                      </div>
                    )}
                    {error && <div style={styles.errorText}>{error}</div>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Inline styles using CSS variable references for dark mode compatibility */
const styles: Record<string, React.CSSProperties> = {
  container: {
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    overflow: 'hidden',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9375rem',
  },
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--table-header-bg)',
  },
  td: {
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-color)',
  },
  positionHeader: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    minWidth: '160px',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  },
  dateHeader: {
    textAlign: 'center',
    minWidth: '160px',
  },
  dateRange: {
    display: 'block',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  days: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 400,
    color: 'var(--text-secondary)',
    marginTop: '0.125rem',
  },
  weekNote: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: 'var(--primary-color)',
    marginTop: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  },
  noMeetingHeader: {
    fontWeight: 600,
    color: 'var(--primary-color)',
    textTransform: 'uppercase',
  },
  positionCell: {
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'var(--card-bg)',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  },
  altRow: {
    background: 'var(--table-header-bg)',
  },
  altPositionCell: {
    background: 'var(--table-header-bg)',
  },
  assignmentCell: {
    textAlign: 'center',
    padding: '0.375rem 0.5rem',
  },
  dirtyCell: {
    background: 'rgba(37, 99, 235, 0.06)',
  },
  noMeetingCell: {
    textAlign: 'center',
    verticalAlign: 'middle',
    background: 'var(--primary-bg)',
  },
  noMeetingText: {
    fontWeight: 600,
    color: 'var(--primary-color)',
    fontSize: '0.9375rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    width: '100%',
    padding: '0.375rem 0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '140px',
  },
  dupeSelect: {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 1px #ef4444',
  },
  saveCell: {
    textAlign: 'center',
    borderBottom: 'none',
    paddingTop: '0.75rem',
  },
  saveBtn: {
    padding: '0.375rem 1rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    color: 'var(--text-secondary)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'not-allowed',
    opacity: 0.5,
    transition: 'all 0.15s ease',
  },
  saveBtnDirty: {
    background: 'var(--primary-color)',
    color: 'white',
    borderColor: 'var(--primary-color)',
    cursor: 'pointer',
    opacity: 1,
  },
  saveBtnSaving: {
    opacity: 0.7,
    cursor: 'wait',
  },
  saveBtnSaved: {
    background: '#10b981',
    borderColor: '#10b981',
    color: 'white',
    opacity: 1,
    cursor: 'default',
  },
  saveBtnError: {
    background: '#ef4444',
    borderColor: '#ef4444',
    color: 'white',
    opacity: 1,
    cursor: 'pointer',
  },
  dupeWarning: {
    fontSize: '0.6875rem',
    color: '#ef4444',
    marginTop: '0.25rem',
    fontWeight: 500,
  },
  errorText: {
    fontSize: '0.6875rem',
    color: '#ef4444',
    marginTop: '0.25rem',
  },
};
