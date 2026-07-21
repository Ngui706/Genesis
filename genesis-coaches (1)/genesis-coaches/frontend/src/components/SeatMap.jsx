/**
 * Renders the bus seat grid. `seats` items look like:
 * { id, seat_number, position_row, position_col, status: 'available'|'locked'|'booked'|'selected' }
 * An aisle gap is inserted after the 2nd column in a 4-across layout (standard 2+2 coach).
 */
export default function SeatMap({ seats, selectedIds, onToggle }) {
  const rows = Math.max(...seats.map((s) => s.position_row), 0);
  const cols = Math.max(...seats.map((s) => s.position_col), 0);

  const grid = [];
  for (let r = 1; r <= rows; r++) {
    const rowSeats = seats.filter((s) => s.position_row === r).sort((a, b) => a.position_col - b.position_col);
    grid.push(rowSeats);
  }

  const stateClasses = (seat) => {
    const isSelected = selectedIds.includes(seat.id);
    if (seat.status === 'booked') return 'bg-white/5 text-slate-dim border-white/5 cursor-not-allowed';
    if (seat.status === 'locked' && !isSelected) return 'bg-danger/20 text-danger border-danger/30 cursor-not-allowed';
    if (isSelected) return 'bg-amber text-midnight border-amber shadow-lg shadow-amber/20 scale-105';
    return 'bg-midnight-3 text-cream border-white/15 hover:border-amber hover:text-amber cursor-pointer';
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-midnight-3 px-4 py-3">
        <div className="h-6 w-10 rounded-t-lg border-2 border-white/20" />
        <span className="text-xs text-slate">Driver / Front of bus</span>
      </div>

      <div className="mx-auto flex max-w-full flex-col gap-2 overflow-x-auto pb-2">
        {grid.map((rowSeats, ri) => (
          <div key={ri} className="flex justify-center gap-2 min-w-fit mx-auto">
            {rowSeats.map((seat, ci) => (
              <div key={seat.id} className="flex items-center gap-2">
                {ci === Math.ceil(cols / 2) && <div className="w-4" />}
                <button
                  type="button"
                  disabled={seat.status === 'booked' || (seat.status === 'locked' && !selectedIds.includes(seat.id))}
                  onClick={() => onToggle(seat)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border font-mono text-xs font-semibold transition ${stateClasses(seat)}`}
                  title={`Seat ${seat.seat_number}`}
                >
                  {seat.seat_number}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate">
        <Legend swatch="bg-midnight-3 border border-white/15" label="Available" />
        <Legend swatch="bg-amber" label="Selected" />
        <Legend swatch="bg-danger/20 border border-danger/30" label="Held by another passenger" />
        <Legend swatch="bg-white/5 border border-white/5" label="Booked" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded ${swatch}`} />
      {label}
    </div>
  );
}
