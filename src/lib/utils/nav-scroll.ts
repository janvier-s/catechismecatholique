export interface NavScrollMetrics {
	/** Current scrollTop of the scrolling book list. */
	scrollTop: number;
	/** Top edge of the scroller's viewport, in client coordinates. */
	containerTop: number;
	/** Visible height of the scroller. */
	containerHeight: number;
	/** Top edge of the book's title button, in client coordinates. */
	headerTop: number;
	/** Bottom edge of the chapter grid, in client coordinates. */
	gridBottom: number;
	/** Height of the title button and chapter grid together. */
	blockHeight: number;
}

/**
 * Where the book list should scroll after a book is expanded, or null to leave
 * it alone.
 *
 * A book whose chapter grid is taller than the scroller cannot be shown whole,
 * so it leads with the title and chapter 1. Aligning the grid's bottom edge
 * instead (the previous behaviour) landed on the final chapter: Psalms, at 150
 * chapters in an 835px grid inside a 595px scroller, opened showing chapters
 * 43-150 with its own title 282px above the fold.
 */
export function expandedBookScrollTop(m: NavScrollMetrics): number | null {
	const containerBottom = m.containerTop + m.containerHeight;
	const alignHeaderTop = m.scrollTop + (m.headerTop - m.containerTop);

	// Too tall to fit: show the start of the book rather than its end.
	if (m.blockHeight > m.containerHeight) return Math.max(0, alignHeaderTop);

	// Fits, but the title has been scrolled above the fold.
	if (m.headerTop < m.containerTop) return Math.max(0, alignHeaderTop);

	// Fits, but the last chapters hang below the fold: pull up just enough.
	if (m.gridBottom > containerBottom) {
		return Math.max(0, m.scrollTop + (m.gridBottom - containerBottom));
	}

	return null;
}
