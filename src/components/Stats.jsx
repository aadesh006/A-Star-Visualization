import styles from './Stats.module.css';

// ─── Stats Bar ─────────────────────────────────────────────────────────────────
// Styled like a technical benchmark table — monospace, flat, bordered columns.
// Updates live during animation to show nodes being explored in real time.

export default function Stats({ astarStats, dijkstraStats, isRunning, hasRun }) {
  const nodesA = astarStats?.nodesExplored ?? 0;
  const nodesD = dijkstraStats?.nodesExplored ?? 0;
  const pathA  = astarStats?.pathLength  ?? 0;
  const pathD  = dijkstraStats?.pathLength ?? 0;

  // How much more efficient was A* in terms of nodes explored?
  const ratio = nodesD > 0 ? ((1 - nodesA / nodesD) * 100).toFixed(1) : null;

  // If A*'s path is longer, the weight setting caused suboptimality
  const pathDelta = pathA > 0 && pathD > 0 ? (pathA - pathD).toFixed(1) : null;

  return (
    <div className={styles.bar}>

      {/* ── Table header row ── */}
      <div className={styles.headerRow}>
        <div className={styles.headerCell}>METRIC</div>
        <div className={`${styles.headerCell} ${styles.astarCol}`}>A*</div>
        <div className={`${styles.headerCell} ${styles.dijkstraCol}`}>DIJKSTRA</div>
        <div className={styles.headerCell}>ΔDIFF</div>
      </div>

      {/* ── Nodes explored ── */}
      <div className={styles.row}>
        <div className={styles.rowLabel}>nodes explored</div>
        <div className={`${styles.rowVal} ${styles.astarCol} ${isRunning && nodesA > 0 ? styles.live : ''}`}>
          {hasRun || isRunning ? nodesA.toLocaleString() : '—'}
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraCol} ${isRunning && nodesD > 0 ? styles.live : ''}`}>
          {hasRun || isRunning ? nodesD.toLocaleString() : '—'}
        </div>
        <div className={styles.rowDiff}>
          {hasRun && ratio !== null
            ? <span className={parseFloat(ratio) > 0 ? styles.better : styles.neutral}>
                {parseFloat(ratio) > 0 ? `A* −${ratio}%` : 'equal'}
              </span>
            : '—'}
        </div>
      </div>

      {/* ── Path length ── */}
      <div className={styles.row}>
        <div className={styles.rowLabel}>path length</div>
        <div className={`${styles.rowVal} ${styles.astarCol}`}>
          {hasRun ? (pathA > 0 ? pathA.toFixed(1) : 'none') : '—'}
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraCol}`}>
          {hasRun ? (pathD > 0 ? pathD.toFixed(1) : 'none') : '—'}
        </div>
        <div className={styles.rowDiff}>
          {hasRun && pathDelta !== null
            ? <span className={parseFloat(pathDelta) > 0 ? styles.worse : styles.better}>
                {parseFloat(pathDelta) > 0 ? `A* +${pathDelta}` : 'equal'}
              </span>
            : '—'}
        </div>
      </div>

      {/* ── Status ── */}
      <div className={styles.row}>
        <div className={styles.rowLabel}>status</div>
        <div className={`${styles.rowVal} ${styles.astarCol}`}>
          {isRunning
            ? <span className={styles.running}>RUNNING</span>
            : hasRun
              ? <span className={astarStats?.found ? styles.found : styles.notFound}>
                  {astarStats?.found ? 'FOUND' : 'NO PATH'}
                </span>
              : '—'}
        </div>
        <div className={`${styles.rowVal} ${styles.dijkstraCol}`}>
          {isRunning
            ? <span className={styles.running}>RUNNING</span>
            : hasRun
              ? <span className={dijkstraStats?.found ? styles.found : styles.notFound}>
                  {dijkstraStats?.found ? 'FOUND' : 'NO PATH'}
                </span>
              : '—'}
        </div>
        <div className={styles.rowDiff}>—</div>
      </div>

    </div>
  );
}
