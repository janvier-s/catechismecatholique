import { debounce } from './debounce';
import { panelWidth } from '$lib/stores/prefs';

const MIN_WIDTH = 280;

export function createPanelResize(
	onLiveWidth?: (w: string) => void,
	onDragChange?: (dragging: boolean) => void
) {
	let panelEl: HTMLElement | null = null;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartWidth = 0;

	const save = debounce((w: string) => panelWidth.set(w), 200);

	function maxWidth(): number {
		return window.innerWidth * 0.6;
	}

	function setWidth(w: number) {
		if (!panelEl) return;
		const clamped = Math.min(Math.max(w, MIN_WIDTH), maxWidth());
		const px = `${clamped}px`;
		panelEl.style.width = px;
		onLiveWidth?.(px);
		save(px);
	}

	function startDrag(clientX: number) {
		if (!panelEl) return;
		isDragging = true;
		dragStartX = clientX;
		dragStartWidth = panelEl.offsetWidth;
		onDragChange?.(true);
	}

	function endDrag() {
		if (!isDragging) return;
		isDragging = false;
		onDragChange?.(false);
	}

	return {
		bindPanel(el: HTMLElement | null) {
			panelEl = el;
		},
		get isDragging() {
			return isDragging;
		},
		onDividerMousedown(e: MouseEvent) {
			startDrag(e.clientX);
			e.preventDefault();
		},
		onMousemove(e: MouseEvent) {
			if (!isDragging) return;
			const delta = dragStartX - e.clientX;
			setWidth(dragStartWidth + delta);
		},
		onMouseup() {
			endDrag();
		},
		onTouchStart(e: TouchEvent) {
			startDrag(e.touches[0]!.clientX);
		},
		onTouchMove(e: TouchEvent) {
			if (!isDragging) return;
			const delta = dragStartX - e.touches[0]!.clientX;
			setWidth(dragStartWidth + delta);
		},
		onTouchEnd() {
			endDrag();
		},
		onKeydown(e: KeyboardEvent) {
			if (!panelEl) return;
			const step = e.shiftKey ? 48 : 16;
			if (e.key === 'ArrowLeft') {
				setWidth(panelEl.offsetWidth + step);
				e.preventDefault();
			} else if (e.key === 'ArrowRight') {
				setWidth(panelEl.offsetWidth - step);
				e.preventDefault();
			}
		}
	};
}
