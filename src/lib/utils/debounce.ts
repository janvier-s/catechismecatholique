// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
	fn: T,
	ms: number
): T & { cancel: () => void } {
	let timer: ReturnType<typeof setTimeout>;
	const debounced = ((...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	}) as T & { cancel: () => void };
	debounced.cancel = () => clearTimeout(timer);
	return debounced;
}
