import { useState } from 'react';
import { DIARY_EMPTY, DIARY_NOTE, diaryDate } from '../../content/attic';
import { useKeepsakes } from '../../state/keepsakes';
import styles from './Attic.module.css';

const PER_PAGE = 4;

/** The House Diary: written from what happened on this page, a few lines per page. */
export function Diary({ onOpen }: { onOpen: (entries: number) => void }) {
  const diary = useKeepsakes((s) => s.diary);
  const [open, setOpen] = useState(false);
  const pages = Math.max(1, Math.ceil(diary.length / PER_PAGE));
  const [page, setPage] = useState(pages - 1);
  const shown = diary.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <section className={styles.diary} aria-labelledby="diary-title">
      <h2 id="diary-title" className={styles.thingTitle}>
        The House Diary
      </h2>
      {!open ? (
        <button
          type="button"
          className={styles.book}
          aria-label="Open the house diary"
          onClick={() => {
            setOpen(true);
            setPage(pages - 1);
            onOpen(diary.length);
          }}
        >
          <span className={styles.bookCover} aria-hidden="true">
            Diary
          </span>
        </button>
      ) : (
        <div className={styles.pageWrap}>
          <p className={styles.small}>{DIARY_NOTE}</p>
          {diary.length === 0 ? (
            <p className={styles.entry}>{DIARY_EMPTY}</p>
          ) : (
            <ol className={styles.entries} aria-label={`Diary page ${page + 1} of ${pages}`}>
              {shown.map((e, i) => (
                <li key={`${e.at}-${i}`} className={styles.entry}>
                  <span className={styles.when}>{diaryDate(e.at)}</span> {e.detail}
                </li>
              ))}
            </ol>
          )}
          <div className={styles.pager}>
            <button type="button" className="paper-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              ← earlier
            </button>
            <span className={styles.small}>
              page {page + 1} of {pages}
            </span>
            <button type="button" className="paper-btn" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
              later →
            </button>
            <button type="button" className="paper-btn" onClick={() => setOpen(false)}>
              close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
