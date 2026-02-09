import { useState, useCallback, useRef, useEffect } from 'react';
import type { AVPosition, Brother, MeetingPartType } from '../types';
import { getEligiblePositionsForBrother } from '../lib/eligibility';

/** Meeting part resolved with brother ID (from Astro frontmatter) */
export interface ResolvedMeetingPart {
  partType: MeetingPartType;
  partTitle: string;
  brotherId: string | null;
}

/** Week data passed from Astro */
export interface MeetingWeek {
  weekOf: string;
  midweekDate: string;
  weekendDate: string;
  assignments: Record<AVPosition, string | null>;
  meetingParts: {
    midweek: ResolvedMeetingPart[];
    weekend: ResolvedMeetingPart[];
  };
  unavailable: {
    noAV: string[];
    noMic: string[];
  };
  noMeeting?: boolean;
  weekendOnly?: boolean;
  note?: string;
}

interface Props {
  weeks: MeetingWeek[];
  brothers: Brother[];
  month: string;
  isDev?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Part type display labels */
const partLabels: Record<MeetingPartType, string> = {
  midweek_chairman: 'Chairman',
  opening_prayer: 'Prayer',
  treasures_talk: 'Treasures Talk',
  spiritual_gems: 'Spiritual Gems',
  bible_reading: 'Bible Reading',
  student_talk: 'Student Talk',
  living_as_christians: 'Living as Christians',
  cbs_chairman: 'CBS Conductor',
  cbs_reader: 'CBS Reader',
  closing_prayer: 'Prayer',
  weekend_chairman: 'Chairman',
  public_talk: 'Public Talk',
  wt_conductor: 'WT Conductor',
  wt_reader: 'WT Reader',
};

/** Sort order for midweek parts */
const midweekPartOrder: MeetingPartType[] = [
  'midweek_chairman',
  'treasures_talk',
  'spiritual_gems',
  'bible_reading',
  'student_talk',
  'living_as_christians',
  'cbs_chairman',
  'cbs_reader',
  'opening_prayer',
  'closing_prayer',
];

/** Sort order for weekend parts */
const weekendPartOrder: MeetingPartType[] = [
  'weekend_chairman',
  'public_talk',
  'wt_conductor',
  'wt_reader',
  'closing_prayer',
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

function formatDateRange(midweekDate: string, weekendDate: string): string {
  const midweek = new Date(midweekDate + 'T00:00:00');
  const weekend = new Date(weekendDate + 'T00:00:00');
  const month = midweek.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${midweek.getDate()} & ${weekend.getDate()}`;
}

/** Find which AV position a brother currently holds */
function getAVPositionForBrother(
  assignments: Record<AVPosition, string | null>,
  brotherId: string
): AVPosition | null {
  for (const [pos, id] of Object.entries(assignments)) {
    if (id === brotherId) return pos as AVPosition;
  }
  return null;
}

/** Get a brother's meeting parts for a specific meeting type */
function getBrotherParts(
  parts: ResolvedMeetingPart[],
  brotherId: string
): string[] {
  return parts
    .filter((p) => p.brotherId === brotherId)
    .map((p) => partLabels[p.partType]);
}

/** Row in the meeting assignments table */
interface BrotherRow {
  brotherId: string;
  name: string;
  midweekParts: string;
  weekendParts: string;
}

/** Build sorted brother rows for a week */
function buildSortedRows(week: MeetingWeek, brothers: Brother[]): BrotherRow[] {
  const rows: BrotherRow[] = [];
  const addedIds = new Set<string>();

  const brotherMap = new Map(brothers.map((b) => [b.id, b]));

  // Helper to add a brother to rows if not already added
  const addBrother = (brotherId: string) => {
    if (addedIds.has(brotherId)) return;
    const brother = brotherMap.get(brotherId);
    if (!brother) return;
    addedIds.add(brotherId);
    rows.push({
      brotherId,
      name: brother.fullName,
      midweekParts:
        getBrotherParts(week.meetingParts.midweek, brotherId).join(', ') ||
        '\u2014',
      weekendParts:
        getBrotherParts(week.meetingParts.weekend, brotherId).join(', ') ||
        '\u2014',
    });
  };

  // 1. Midweek parts in order
  if (!week.weekendOnly) {
    for (const partType of midweekPartOrder) {
      const parts = week.meetingParts.midweek.filter(
        (p) => p.partType === partType
      );
      for (const part of parts) {
        if (part.brotherId) addBrother(part.brotherId);
      }
    }
  }

  // 2. Weekend parts in order (skip already added)
  for (const partType of weekendPartOrder) {
    const parts = week.meetingParts.weekend.filter(
      (p) => p.partType === partType
    );
    for (const part of parts) {
      if (part.brotherId) addBrother(part.brotherId);
    }
  }

  // 3. Remaining active brothers (sorted by last name)
  const remaining = brothers
    .filter((b) => !addedIds.has(b.id))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  for (const brother of remaining) {
    addBrother(brother.id);
  }

  return rows;
}

export default function MeetingAssignments({
  weeks,
  brothers,
  month,
  isDev = false,
}: Props) {
  // State: assignments per week
  const [weekAssignments, setWeekAssignments] = useState<
    Record<string, Record<AVPosition, string | null>>
  >(() => {
    const init: Record<string, Record<AVPosition, string | null>> = {};
    for (const week of weeks) {
      init[week.weekOf] = { ...week.assignments };
    }
    return init;
  });

  // Save statuses per week
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    () => {
      const init: Record<string, SaveStatus> = {};
      for (const week of weeks) {
        init[week.weekOf] = 'idle';
      }
      return init;
    }
  );

  // Refs for auto-save
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const assignmentsRef = useRef(weekAssignments);
  assignmentsRef.current = weekAssignments;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(saveTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Save a week's assignments to the dev API
  const saveWeek = useCallback(
    async (weekOf: string) => {
      if (!isDev) return;

      setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'saving' }));

      try {
        const res = await fetch(`/api/schedule/${month}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekOf,
            assignments: assignmentsRef.current[weekOf],
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'saved' }));
        setTimeout(() => {
          setSaveStatuses((prev) =>
            prev[weekOf] === 'saved' ? { ...prev, [weekOf]: 'idle' } : prev
          );
        }, 1500);
      } catch {
        setSaveStatuses((prev) => ({ ...prev, [weekOf]: 'error' }));
        setTimeout(() => {
          setSaveStatuses((prev) =>
            prev[weekOf] === 'error' ? { ...prev, [weekOf]: 'idle' } : prev
          );
        }, 3000);
      }
    },
    [isDev, month]
  );

  // Schedule auto-save with debounce
  const scheduleAutoSave = useCallback(
    (weekOf: string) => {
      if (saveTimers.current[weekOf]) {
        clearTimeout(saveTimers.current[weekOf]);
      }
      saveTimers.current[weekOf] = setTimeout(() => {
        saveWeek(weekOf);
      }, 800);
    },
    [saveWeek]
  );

  // Handle AV dropdown change
  const handleChange = useCallback(
    (weekOf: string, brotherId: string, newPosition: string) => {
      setWeekAssignments((prev) => {
        const current = { ...prev[weekOf] };

        // Clear brother's old position
        for (const [pos, id] of Object.entries(current)) {
          if (id === brotherId) {
            current[pos as AVPosition] = null;
          }
        }

        // Set new position (if not "none")
        if (newPosition) {
          current[newPosition as AVPosition] = brotherId;
        }

        return { ...prev, [weekOf]: current };
      });

      scheduleAutoSave(weekOf);
    },
    [scheduleAutoSave]
  );

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={s.sectionTitle}>Meeting Assignments</h3>
      <div style={s.weeksGrid}>
        {weeks.map((week) => {
          if (week.noMeeting) return null;

          const assignments = weekAssignments[week.weekOf] || week.assignments;
          const rows = buildSortedRows(week, brothers);
          const status = saveStatuses[week.weekOf] || 'idle';

          return (
            <div key={week.weekOf} style={s.weekCard}>
              <div style={s.weekHeader}>
                <span>
                  {formatDateRange(week.midweekDate, week.weekendDate)}
                </span>
                <span style={s.days}>
                  {week.weekendOnly ? '(Sun only)' : '(Fri & Sun)'}
                </span>
                {week.note && <span style={s.noteBadge}>{week.note}</span>}
                {isDev && status !== 'idle' && (
                  <span
                    style={{
                      ...s.saveIndicator,
                      ...(status === 'saving' ? s.saveIndicatorSaving : {}),
                      ...(status === 'saved' ? s.saveIndicatorSaved : {}),
                      ...(status === 'error' ? s.saveIndicatorError : {}),
                    }}
                  >
                    {status === 'saving'
                      ? 'Saving...'
                      : status === 'saved'
                        ? 'Saved'
                        : 'Save failed'}
                  </span>
                )}
              </div>
              <div style={s.tableWrapper}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, ...s.nameCol }}>Brother</th>
                      <th style={{ ...s.th, ...s.partCol }}>Midweek</th>
                      <th style={{ ...s.th, ...s.partCol }}>Weekend</th>
                      <th style={{ ...s.th, ...s.avCol }}>AV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isAlt = idx % 2 === 1;
                      const currentAV = getAVPositionForBrother(
                        assignments,
                        row.brotherId
                      );
                      const eligiblePositions = getEligiblePositionsForBrother(
                        row.brotherId,
                        brothers,
                        week.unavailable,
                        assignments
                      );
                      const hasMidweek = row.midweekParts !== '\u2014';
                      const hasWeekend = row.weekendParts !== '\u2014';

                      return (
                        <tr
                          key={row.brotherId}
                          style={isAlt ? s.altRow : undefined}
                        >
                          <td style={{ ...s.td, ...s.nameCell }}>{row.name}</td>
                          <td
                            style={{
                              ...s.td,
                              ...s.partCell,
                              ...(hasMidweek ? {} : s.noPart),
                            }}
                          >
                            {row.midweekParts}
                          </td>
                          <td
                            style={{
                              ...s.td,
                              ...s.partCell,
                              ...(hasWeekend ? {} : s.noPart),
                            }}
                          >
                            {row.weekendParts}
                          </td>
                          <td style={{ ...s.td, ...s.avCell }}>
                            {eligiblePositions.length === 0 && !currentAV ? (
                              <span style={s.noPart}>{'\u2014'}</span>
                            ) : (
                              <select
                                value={currentAV || ''}
                                onChange={(e) =>
                                  handleChange(
                                    week.weekOf,
                                    row.brotherId,
                                    e.target.value
                                  )
                                }
                                style={s.select}
                              >
                                <option value="">-- None --</option>
                                {eligiblePositions.map((pos) => (
                                  <option key={pos} value={pos}>
                                    {positionLabels[pos]}
                                  </option>
                                ))}
                                {/* Show current position even if ineligible (manual override) */}
                                {currentAV &&
                                  !eligiblePositions.includes(currentAV) && (
                                    <option value={currentAV}>
                                      {positionLabels[currentAV]} (ineligible)
                                    </option>
                                  )}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Styles using CSS variables for dark mode compatibility */
const s: Record<string, React.CSSProperties> = {
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '1rem',
  },
  weeksGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  weekCard: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '0.5rem',
    overflow: 'hidden',
  },
  weekHeader: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--table-header-bg)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  days: {
    fontWeight: 400,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  noteBadge: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.125rem 0.375rem',
    borderRadius: '0.25rem',
    background: 'var(--primary-bg)',
    color: 'var(--primary-color)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  },
  saveIndicator: {
    marginLeft: 'auto',
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.125rem 0.5rem',
    borderRadius: '0.25rem',
  },
  saveIndicatorSaving: {
    color: 'var(--text-secondary)',
  },
  saveIndicatorSaved: {
    color: '#10b981',
  },
  saveIndicatorError: {
    color: '#ef4444',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    borderBottom: '1px solid var(--border-color)',
  },
  nameCol: {
    minWidth: '140px',
  },
  partCol: {
    minWidth: '120px',
  },
  avCol: {
    minWidth: '140px',
  },
  td: {
    padding: '0.375rem 0.75rem',
    borderBottom: '1px solid var(--border-color)',
  },
  altRow: {
    background: 'var(--table-header-bg)',
  },
  nameCell: {
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  },
  partCell: {
    color: 'var(--text-primary)',
    fontSize: '0.75rem',
  },
  noPart: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  avCell: {
    padding: '0.25rem 0.5rem',
  },
  select: {
    width: '100%',
    padding: '0.3rem 0.4rem',
    borderRadius: '0.375rem',
    border: '1px solid var(--border-color)',
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    outline: 'none',
  },
};
