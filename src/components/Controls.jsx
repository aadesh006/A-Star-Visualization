import { HEURISTICS } from '../utils/algorithms';
import styles from './Controls.module.css';

// ─── Inline SVG icons — no external dependency ────────────────────────────────

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const MazeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18"/>
    <path d="M9 3v6M15 3v4M3 9h6M15 9h6M3 15h4M9 15h6M15 15v6M9 21v-6M3 21h6"/>
  </svg>
);

// ─── Draw mode options ─────────────────────────────────────────────────────────
const MODES = [
  { id: 'wall',  label: 'WALL',  title: 'Click/drag to draw walls'  },
  { id: 'start', label: 'START', title: 'Click to place start node' },
  { id: 'end',   label: 'END',   title: 'Click to place end node'   },
];

// ─── Controls Component ────────────────────────────────────────────────────────

export default function Controls({
  heuristic,
  setHeuristic,
  weight,
  setWeight,
  speed,
  setSpeed,
  interactMode,
  setInteractMode,
  isRunning,
  onRun,
  onReset,
  onMaze,
  onClear,
}) {
  return (
    <aside className={styles.panel}>

      {/* ── Oversized header block — Swiss-inspired ── */}
      <div className={styles.header}>
        <div className={styles.headerTag}>PATHFINDING</div>
        <div className={styles.headerTitle}>A* <span className={styles.vs}>VS</span></div>
        <div className={styles.headerTitle}>DIJKSTRA</div>
        <div className={styles.headerSub}>— graph traversal visualizer</div>
      </div>

      {/* ── Draw Mode ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>DRAW MODE</div>
        <div className={styles.modeGroup}>
          {MODES.map(m => (
            <button
              key={m.id}
              className={`${styles.modeBtn} ${interactMode === m.id ? styles.modeBtnActive : ''}`}
              onClick={() => setInteractMode(m.id)}
              title={m.title}
              disabled={isRunning}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Heuristic ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          HEURISTIC
          <span className={styles.labelNote}>A* only</span>
        </div>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={heuristic}
            onChange={e => setHeuristic(e.target.value)}
            disabled={isRunning}
          >
            {Object.entries(HEURISTICS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <p className={styles.heuristicDesc}>{HEURISTIC_DESCRIPTIONS[heuristic]}</p>
      </section>

      {/* ── Weight ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          WEIGHT
          <span className={styles.valueTag}>×{weight.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={weight}
          onChange={e => setWeight(parseFloat(e.target.value))}
          className={styles.slider}
          disabled={isRunning}
        />
        <div className={styles.sliderLabels}>
          <span>0</span>
          <span>1 ← optimal</span>
          <span>5</span>
        </div>
        {weight > 1 && (
          <div className={styles.warningBox}>
            w &gt; 1 — suboptimal path, fewer explored nodes
          </div>
        )}
      </section>

      {/* ── Speed ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          SPEED
          <span className={styles.valueTag}>{SPEED_LABELS[speed]}</span>
        </div>
        <input
          type="range"
          min="0"
          max="3"
          step="1"
          value={speed}
          onChange={e => setSpeed(parseInt(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}>
          <span>SLOW</span>
          <span>INSTANT</span>
        </div>
      </section>

      {/* ── Actions ── */}
      <section className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnRun} ${isRunning ? styles.btnRunning : ''}`}
          onClick={onRun}
          disabled={isRunning}
        >
          <PlayIcon />
          {isRunning ? 'RUNNING…' : 'RUN'}
        </button>

        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onReset}>
          <ResetIcon />
          CLEAR PATHS
        </button>

        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onMaze}
            disabled={isRunning}
          >
            <MazeIcon />
            MAZE
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClear}
            disabled={isRunning}
          >
            CLEAR ALL
          </button>
        </div>
      </section>

      {/* ── Version tag at the bottom — docs site aesthetic ── */}
      <div className={styles.footer}>
        <span>v0.1.0</span>
        <span>8-dir grid · {28}×{56}</span>
      </div>

    </aside>
  );
}

const HEURISTIC_DESCRIPTIONS = {
  manhattan:  'Allows only cardinal moves. Explores in a diamond/cross shape.',
  euclidean:  'Straight-line distance. Explores in a circular frontier.',
  chebyshev:  'Diagonals cost 1. Explores in a square shape.',
  octile:     'Diagonals cost √2. Most accurate for 8-directional grids.',
  zero:       'No heuristic guidance. Degrades to Dijkstra behavior.',
};

const SPEED_LABELS = ['SLOW', 'NORMAL', 'FAST', 'INSTANT'];
