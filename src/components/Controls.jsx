import { HEURISTICS } from '../utils/algorithms';
import styles from './Controls.module.css';

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlayIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const StepIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2.5-6 5-3.5-5-3.5v7zM16 6h2v12h-2z"/></svg>;
const ResetIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const MazeIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18"/><path d="M9 3v6M15 3v4M3 9h6M15 9h6M3 15h4M9 15h6M15 15v6M9 21v-6M3 21h6"/></svg>;

// ─── Draw modes — wall + terrain + start/end ──────────────────────────────────
const DRAW_MODES = [
  { id: 'wall',  label: 'WALL',  title: 'Click/drag to draw walls'          },
  { id: 'sand',  label: 'SAND',  title: 'Draw sand terrain (cost ×3)'       },
  { id: 'water', label: 'WATER', title: 'Draw water terrain (cost ×5)'      },
  { id: 'start', label: 'START', title: 'Click to relocate start node'      },
  { id: 'end',   label: 'END',   title: 'Click to relocate end node'        },
];

const HEURISTIC_DESCRIPTIONS = {
  manhattan: 'Cardinal moves only. Explores in a diamond shape.',
  euclidean: 'Straight-line distance. Circular frontier.',
  chebyshev: 'Diagonals cost 1. Square frontier.',
  octile:    'Diagonals cost √2. Most accurate for 8-dir grids.',
  zero:      'No guidance — A* degrades to Dijkstra.',
};

const SPEED_LABELS = ['SLOW', 'NORMAL', 'FAST', 'INSTANT'];

// ─── Controls Component ────────────────────────────────────────────────────────

export default function Controls({
  heuristic, setHeuristic,
  weight, setWeight,
  speed, setSpeed,
  interactMode, setInteractMode,
  showGreedy, setShowGreedy,
  isRunning, isPaused,
  onRun, onPause, onResume, onStepForward,
  onReset, onMaze, onClear,
}) {
  return (
    <aside className={styles.panel}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerTag}>PATHFINDING</div>
        <div className={styles.headerTitle}>A* <span className={styles.vs}>VS</span></div>
        <div className={styles.headerTitle}>DIJKSTRA</div>
        <div className={styles.headerSub}>— graph traversal visualizer</div>
      </div>

      {/* ── Draw Mode ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>DRAW MODE</div>
        <div className={styles.modeGrid}>
          {DRAW_MODES.map(m => (
            <button
              key={m.id}
              className={`${styles.modeBtn} ${styles[`mode_${m.id}`]} ${interactMode === m.id ? styles.modeBtnActive : ''}`}
              onClick={() => setInteractMode(m.id)}
              title={m.title}
              disabled={isRunning && !isPaused}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className={styles.terrainHint}>
          Sand ×3 cost &nbsp;·&nbsp; Water ×5 cost &nbsp;·&nbsp; drag to erase
        </div>
      </section>

      {/* ── Algorithms toggle ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>ALGORITHMS</div>
        <div className={styles.algoList}>
          <AlgoTag color="astar"    label="A*"           active />
          <AlgoTag color="dijkstra" label="Dijkstra"     active />
          <AlgoTag
            color="greedy"
            label="Greedy BFS"
            active={showGreedy}
            onClick={() => setShowGreedy(v => !v)}
            toggle
          />
        </div>
        <div className={styles.terrainHint}>
          Greedy ignores terrain cost — only uses heuristic
        </div>
      </section>

      {/* ── Heuristic ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          HEURISTIC
          <span className={styles.labelNote}>A* + Greedy</span>
        </div>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={heuristic}
            onChange={e => setHeuristic(e.target.value)}
            disabled={isRunning && !isPaused}
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
          A* WEIGHT
          <span className={styles.valueTag}>×{weight.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0" max="5" step="0.1"
          value={weight}
          onChange={e => setWeight(parseFloat(e.target.value))}
          className={styles.slider}
          disabled={isRunning && !isPaused}
        />
        <div className={styles.sliderLabels}>
          <span>0</span><span>1 ← optimal</span><span>5</span>
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
          type="range" min="0" max="3" step="1"
          value={speed}
          onChange={e => setSpeed(parseInt(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderLabels}><span>SLOW</span><span>INSTANT</span></div>
      </section>

      {/* ── Primary action + step controls ── */}
      <section className={styles.actions}>
        {/* Run / Pause / Resume — mutually exclusive states */}
        {!isRunning && (
          <button className={`${styles.btn} ${styles.btnRun}`} onClick={onRun}>
            <PlayIcon /> RUN
          </button>
        )}
        {isRunning && !isPaused && (
          <button className={`${styles.btn} ${styles.btnRun} ${styles.btnRunning}`} onClick={onPause}>
            <PauseIcon /> PAUSE
          </button>
        )}
        {isRunning && isPaused && (
          <div className={styles.btnRow}>
            <button className={`${styles.btn} ${styles.btnRun}`} onClick={onResume} style={{ flex: 1 }}>
              <PlayIcon /> RESUME
            </button>
            <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onStepForward} title="Advance one frame">
              <StepIcon /> STEP
            </button>
          </div>
        )}

        <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onReset}>
          <ResetIcon /> CLEAR PATHS
        </button>

        <div className={styles.btnRow}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onMaze} disabled={isRunning && !isPaused}>
            <MazeIcon /> MAZE
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClear} disabled={isRunning && !isPaused}>
            CLEAR ALL
          </button>
        </div>
      </section>

      {/* ── Insight note — explains what to look for ── */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>INSIGHTS</div>
        <div className={styles.insightList}>
          <InsightRow label="A* vs Dijkstra"  text="A* explores fewer nodes using the heuristic as a guide" />
          <InsightRow label="Weight &gt; 1"   text="Faster search but may skip the true shortest path" />
          <InsightRow label="Greedy"           text="Fastest to goal but ignores costs — path often suboptimal" />
          <InsightRow label="Terrain"          text="Hover cells post-run to see g (actual) and f (estimated) costs" />
        </div>
      </section>

      <div className={styles.footer}>
        <span>v0.2.0</span>
        <span>8-dir · {28}×{56}</span>
      </div>
    </aside>
  );
}

function AlgoTag({ color, label, active, onClick, toggle }) {
  return (
    <button
      className={`${styles.algoTag} ${styles[`algo_${color}`]} ${active ? styles.algoTagActive : ''} ${toggle ? styles.algoTagToggle : ''}`}
      onClick={toggle ? onClick : undefined}
      disabled={!toggle}
      title={toggle ? (active ? 'Click to hide Greedy' : 'Click to show Greedy') : undefined}
    >
      <span className={styles.algoTagDot} />
      {label}
      {toggle && <span className={styles.algoTagBadge}>{active ? 'ON' : 'OFF'}</span>}
    </button>
  );
}

function InsightRow({ label, text }) {
  return (
    <div className={styles.insightRow}>
      <div className={styles.insightLabel}>{label}</div>
      <div className={styles.insightText}>{text}</div>
    </div>
  );
}
