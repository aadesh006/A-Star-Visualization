import { HEURISTICS } from '../utils/algorithms';
import styles from './Controls.module.css';

// ─── Icon components (inline SVG, no dependency needed) ───────────────────────

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const MazeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M9 3v6M15 3v4M3 9h6M15 9h6M3 15h4M9 15h6M15 15v6M9 21v-6M3 21h6"/>
  </svg>
);

// ─── Mode buttons config — determines what clicking a cell does ───────────────
const MODES = [
  { id: 'wall',  label: 'Wall',  icon: '■', title: 'Click/drag to draw walls' },
  { id: 'start', label: 'Start', icon: '◉', title: 'Click to move start point' },
  { id: 'end',   label: 'End',   icon: '◎', title: 'Click to move end point'   },
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
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>⬡</span>
          <div>
            <div className={styles.logoTitle}>Pathfinder</div>
            <div className={styles.logoSub}>A* vs Dijkstra</div>
          </div>
        </div>
      </div>

      {/* ── Interaction Mode ── */}
      <section className={styles.section}>
        <label className={styles.sectionLabel}>Draw Mode</label>
        <div className={styles.modeGroup}>
          {MODES.map(m => (
            <button
              key={m.id}
              className={`${styles.modeBtn} ${interactMode === m.id ? styles.modeBtnActive : ''}`}
              onClick={() => setInteractMode(m.id)}
              title={m.title}
              disabled={isRunning}
            >
              <span className={styles.modeIcon}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Heuristic ── */}
      <section className={styles.section}>
        <label className={styles.sectionLabel}>
          A* Heuristic
          <span className={styles.hint}>affects exploration shape</span>
        </label>
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
          <span className={styles.selectArrow}>▾</span>
        </div>
        {/* Describe what the selected heuristic actually does */}
        <p className={styles.heuristicDesc}>{HEURISTIC_DESCRIPTIONS[heuristic]}</p>
      </section>

      {/* ── Weight Slider ── */}
      <section className={styles.section}>
        <label className={styles.sectionLabel}>
          Heuristic Weight
          <span className={styles.valueTag}>×{weight.toFixed(1)}</span>
        </label>
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
          <span>0 (Dijkstra)</span>
          <span>1 (optimal)</span>
          <span>5 (fast)</span>
        </div>
        {weight > 1 && (
          <p className={styles.weightWarning}>
            ⚠ Weight &gt; 1 — A* may find suboptimal paths but explores fewer nodes
          </p>
        )}
      </section>

      {/* ── Speed ── */}
      <section className={styles.section}>
        <label className={styles.sectionLabel}>
          Animation Speed
          <span className={styles.valueTag}>{SPEED_LABELS[speed]}</span>
        </label>
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
          <span>Slow</span>
          <span style={{ marginLeft: 'auto' }}>Instant</span>
        </div>
      </section>

      {/* ── Action Buttons ── */}
      <section className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnPrimary} ${isRunning ? styles.btnRunning : ''}`}
          onClick={onRun}
          disabled={isRunning}
        >
          <PlayIcon />
          {isRunning ? 'Running…' : 'Visualize'}
        </button>

        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onReset}
        >
          <ResetIcon />
          Clear Paths
        </button>

        <div className={styles.btnRow}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onMaze}
            disabled={isRunning}
            title="Generate a random maze"
          >
            <MazeIcon />
            Maze
          </button>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClear}
            disabled={isRunning}
            title="Clear all walls"
          >
            Clear All
          </button>
        </div>
      </section>

      {/* ── Legend ── */}
      <section className={styles.section}>
        <label className={styles.sectionLabel}>Legend</label>
        <div className={styles.legend}>
          <LegendItem color="var(--node-start)"      label="Start" />
          <LegendItem color="var(--node-end)"        label="End" />
          <LegendItem color="var(--node-wall)"       label="Wall" border />
          <LegendItem color="var(--astar-visited)"   label="A* visited" />
          <LegendItem color="var(--dijkstra-visited)" label="Dijkstra visited" />
          <LegendItem color="var(--astar-path)"      label="A* path" />
          <LegendItem color="var(--dijkstra-path)"   label="Dijkstra path" />
          <LegendItem color="#c8d8ff"                label="Shared path" />
        </div>
      </section>
    </aside>
  );
}

function LegendItem({ color, label, border }) {
  return (
    <div className={styles.legendItem}>
      <span
        className={styles.legendSwatch}
        style={{
          background: color,
          border: border ? '1px solid #333' : 'none',
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// Short descriptions shown under the heuristic dropdown
const HEURISTIC_DESCRIPTIONS = {
  manhattan:  'Diagonal not allowed — explores in a cross/diamond shape.',
  euclidean:  'Straight-line distance — explores in a circular shape.',
  chebyshev:  'Diagonals cost 1 — explores in a square shape.',
  octile:     'Diagonals cost √2 — most accurate for 8-dir grids.',
  zero:       'No guidance — A* degrades to Dijkstra (uniform cost).',
};

const SPEED_LABELS = ['Slow', 'Normal', 'Fast', 'Instant'];
