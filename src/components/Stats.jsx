import styles from './Stats.module.css';

// ─── Stats Panel ───────────────────────────────────────────────────────────────
// Shows a live comparison of nodes explored, path length, and efficiency ratio
// between A* and Dijkstra. Updates frame-by-frame during animation.

export default function Stats({ astarStats, dijkstraStats, isRunning, hasRun }) {
  const nodesA = astarStats?.nodesExplored ?? 0;
  const nodesD = dijkstraStats?.nodesExplored ?? 0;
  const pathA  = astarStats?.pathLength ?? 0;
  const pathD  = dijkstraStats?.pathLength ?? 0;

  // Efficiency ratio: how many fewer nodes did A* explore vs Dijkstra?
  const ratio = nodesD > 0 ? ((1 - nodesA / nodesD) * 100).toFixed(1) : null;

  // Path quality: if A*'s path is longer, weight is causing suboptimality
  const pathDelta = pathA > 0 && pathD > 0 ? pathA - pathD : null;

  return (
    <div className={styles.statsBar}>
      {/* ── A* Column ── */}
      <StatCard
        algo="A*"
        color="astar"
        nodes={nodesA}
        pathLen={pathA}
        found={astarStats?.found}
        hasRun={hasRun}
        isRunning={isRunning}
      />

      {/* ── Comparison column — only shown after both have run ── */}
      <div className={styles.compareCol}>
        {hasRun && ratio !== null ? (
          <>
            <div className={styles.compareLabel}>efficiency gain</div>
            <div className={styles.compareValue} style={{ color: ratio > 0 ? 'var(--node-start)' : 'var(--node-end)' }}>
              {ratio > 0 ? `A* saved ${ratio}%` : 'equal'}
            </div>
            {pathDelta !== null && pathDelta !== 0 && (
              <div className={styles.compareWarning}>
                A* path +{pathDelta.toFixed(1)} longer<br />(weighted heuristic)
              </div>
            )}
            {pathDelta === 0 && (
              <div className={styles.compareNote}>paths identical ✓</div>
            )}
          </>
        ) : (
          <div className={styles.comparePlaceholder}>
            {isRunning ? 'computing…' : 'run to compare'}
          </div>
        )}
      </div>

      {/* ── Dijkstra Column ── */}
      <StatCard
        algo="Dijkstra"
        color="dijkstra"
        nodes={nodesD}
        pathLen={pathD}
        found={dijkstraStats?.found}
        hasRun={hasRun}
        isRunning={isRunning}
      />
    </div>
  );
}

// ─── Individual stat card ──────────────────────────────────────────────────────

function StatCard({ algo, color, nodes, pathLen, found, hasRun, isRunning }) {
  return (
    <div className={`${styles.card} ${styles[color]}`}>
      <div className={styles.cardHeader}>
        <span className={styles.algoName}>{algo}</span>
        {hasRun && (
          <span className={`${styles.badge} ${found ? styles.badgeFound : styles.badgeNotFound}`}>
            {found ? 'path found' : 'no path'}
          </span>
        )}
      </div>

      <div className={styles.metrics}>
        <Metric
          label="Nodes explored"
          value={hasRun || isRunning ? nodes.toLocaleString() : '—'}
          isRunning={isRunning && nodes > 0}
        />
        <Metric
          label="Path length"
          value={hasRun ? (pathLen > 0 ? pathLen.toFixed(1) : '—') : '—'}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, isRunning }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={`${styles.metricValue} ${isRunning ? styles.metricRunning : ''}`}>
        {value}
      </div>
    </div>
  );
}
