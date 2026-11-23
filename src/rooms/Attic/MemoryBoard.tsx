import { CLUES, DECADES, RESIDENTS, type Decade, type ResidentId } from '../../content/attic';
import { EvidenceArt } from './EvidenceArt';
import { onBoard, residentsInPlay, revealed, type Board, type Pin } from './mystery/board';
import styles from './AtticRoom.module.css';

interface Props {
  board: Board;
  onPin: (thing: string, patch: Pin) => void;
  onRead: (id: string) => void;
  /** Thing ids that locked a moment ago (for the pin-and-thread animation). */
  fresh: string[];
}

/**
 * The corkboard. Every thing found is pinned here; give it a string to a
 * person and a decade. It never tells you which one is wrong; three right
 * together lock in.
 */
export function MemoryBoard({ board, onPin, onRead, fresh }: Props) {
  const people = residentsInPlay(board);
  const known = revealed(board);
  const things = onBoard(board);
  const clues = CLUES.filter((c) => board.found.includes(c.id));
  const label = (id: ResidentId) => {
    const r = RESIDENTS.find((x) => x.id === id)!;
    return known.includes(id) ? r.name : `someone (${people.findIndex((p) => p.id === id) + 1})`;
  };
  return (
    <section className={styles.board} aria-labelledby="board-title">
      <h2 id="board-title" className={styles.boardTitle}>
        Memory Board <span>act {board.act} of 3</span>
      </h2>

      <ul className={styles.people} aria-label="Who lived here">
        {people.map((r, i) => {
          const shown = known.includes(r.id);
          return (
            <li key={r.id} className={styles.person} data-known={shown} style={{ '--who': r.colour } as React.CSSProperties}>
              <svg viewBox="0 0 40 46" aria-hidden="true">
                <circle cx="20" cy="15" r="10" fill={shown ? 'var(--paper)' : 'var(--char-ink)'} stroke="var(--char-ink)" strokeWidth="2" />
                <path d="M4 46 C 4 30 36 30 36 46 Z" fill={shown ? r.colour : 'var(--char-ink)'} stroke="var(--char-ink)" strokeWidth="2" />
                {shown ? <path d="M16 15 h.1 M24 15 h.1 M16 20 q 4 3 8 0" stroke="var(--char-ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" /> : <text x="20" y="20" textAnchor="middle" fontSize="12" fill="#fff">?</text>}
              </svg>
              <span className={styles.personName}>{shown ? r.name : `someone ${i + 1}`}</span>
              {shown ? <span className={styles.personRole}>{r.role}</span> : null}
            </li>
          );
        })}
      </ul>

      {things.length ? (
        <ul className={styles.things} aria-label="Things pinned to the board">
          {things.map((t) => {
            const p = board.pins[t.id] ?? {};
            const locked = board.locked.includes(t.id);
            const who = p.owner ? RESIDENTS.find((r) => r.id === p.owner) : null;
            const di = p.decade ? DECADES.indexOf(p.decade) : -1;
            const setDecade = (dir: 1 | -1) => {
              const n = di < 0 ? (dir > 0 ? 0 : DECADES.length - 1) : Math.max(0, Math.min(DECADES.length - 1, di + dir));
              onPin(t.id, { decade: DECADES[n] as Decade });
            };
            return (
              <li key={t.id} className={styles.thing} data-locked={locked} data-fresh={fresh.includes(t.id) || undefined} style={{ '--who': who?.colour ?? 'transparent' } as React.CSSProperties}>
                <button type="button" className={styles.thingArt} onClick={() => onRead(t.id)} aria-label={`${t.name}: ${t.looks}`}>
                  <EvidenceArt id={t.id} />
                </button>
                <div className={styles.thingBody}>
                  <strong>{t.name}</strong>
                  {locked ? (
                    <span className={styles.lockedNote}>
                      {label(t.owner)}, {t.decade}s. Remembered.
                    </span>
                  ) : (
                    <>
                      <div className={styles.owners} role="radiogroup" aria-label={`Whose was the ${t.name.toLowerCase()}?`}>
                        {people.map((r) => (
                          <button key={r.id} type="button" role="radio" aria-checked={p.owner === r.id} className={styles.ownerChip} style={{ '--who': r.colour } as React.CSSProperties} onClick={() => onPin(t.id, { owner: r.id })} aria-label={label(r.id)}>
                            {known.includes(r.id) ? r.name.split(' ')[0]![0] : '?'}
                            <span aria-hidden="true">{people.indexOf(r) + 1}</span>
                          </button>
                        ))}
                      </div>
                      <div className={styles.decade} role="group" aria-label={`When? ${p.decade ? `${p.decade}s` : 'not set'}`}>
                        <button type="button" onClick={() => setDecade(-1)} aria-label="Earlier">
                          ◀
                        </button>
                        <span aria-live="polite">{p.decade ? `${p.decade}s` : '—'}</span>
                        <button type="button" onClick={() => setDecade(1)} aria-label="Later">
                          ▶
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>Nothing pinned yet. Find something under the dust.</p>
      )}

      <details className={styles.notebook}>
        <summary>Marguerite’s notes ({clues.length})</summary>
        <ul>
          {clues.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onRead(c.id)}>
                {c.title}
              </button>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
