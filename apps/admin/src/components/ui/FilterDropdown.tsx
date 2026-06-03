"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { classNames } from "@store/shared";
import { Popover } from "@/components/ui/Popover";

export interface FilterOption {
	value: string;
	label: string;
	count?: number;
}

interface FilterDropdownProps {
	label: string;
	options: FilterOption[];
	selected: string[];
	onChange: (next: string[]) => void;
	/** When true the popover behaves like a radio group (one value at a time). */
	single?: boolean;
	disabled?: boolean;
	className?: string;
}

/**
 * Universal Filter Dropdown Component (Standard)
 *
 * Compact admin list-filter dropdown used in list views and tables.
 * This is the standard component to use whenever you need to filter a table
 * or list.
 * 
 * Powered by `<Popover>`: Uses a React portal to render the dropdown menu at
 * the document root. This ensures that the filter menu will NEVER be trapped
 * behind animated table rows, `overflow: hidden` containers, or z-index 
 * stacking contexts.
 *
 * Single-select mode: closes on pick, replaces the chip label with
 * "Label: Value" so the active selection is visible without opening.
 *
 * Multi-select mode: toggles each option, surfaces an inline `×` on the
 * trigger to clear in one click, and renders a "Clear (N)" footer when
 * any value is selected.
 *
 * Popover dismisses on outside click and Escape.
 */
export function FilterDropdown({
	label,
	options,
	selected,
	onChange,
	single,
	disabled,
	className,
}: FilterDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		function handlePointerDown(event: globalThis.MouseEvent) {
			if (!containerRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		function handleKey(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKey);
		};
	}, [isOpen]);

	const activeCount = selected.length;
	const isActive = activeCount > 0;
	const isDisabled = disabled || options.length === 0;

	function toggle(value: string) {
		if (single) {
			onChange([value]);
			setIsOpen(false);
			return;
		}
		if (selected.includes(value)) {
			onChange(selected.filter((entry) => entry !== value));
		} else {
			onChange([...selected, value]);
		}
	}

	function clear(event: MouseEvent) {
		event.stopPropagation();
		onChange([]);
		setIsOpen(false);
	}

	const singleSelectedLabel =
		single && activeCount === 1
			? options.find((option) => option.value === selected[0])?.label
			: undefined;

	const triggerLabel = singleSelectedLabel
		? `${label}: ${singleSelectedLabel}`
		: isActive
			? `${label} · ${activeCount}`
			: label;

	return (
		<div className={classNames("relative", className)} ref={containerRef}>
			<button
				type="button"
				disabled={isDisabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				onClick={() => setIsOpen((prev) => !prev)}
				className={classNames(
					"inline-flex max-w-[14rem] items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors",
					isDisabled
						? "cursor-not-allowed border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-[var(--color-ink-300)]"
						: isActive
							? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)] hover:bg-[var(--color-accent-200)]"
							: "border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
				)}
			>
				<span className="truncate">{triggerLabel}</span>
				{isActive ? (
					<span
						role="button"
						tabIndex={0}
						aria-label={`Clear ${label} filter`}
						onClick={clear}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								clear(event as unknown as MouseEvent);
							}
						}}
						className="grid size-3.5 shrink-0 place-items-center rounded-full text-[var(--color-accent-700)] hover:bg-[var(--color-accent-200)]"
					>
						<X size={10} />
					</span>
				) : (
					<ChevronDown
						size={11}
						className={classNames(
							"shrink-0 transition-transform",
							isOpen && "rotate-180",
						)}
					/>
				)}
			</button>
			<Popover
				isOpen={isOpen}
				anchorRef={containerRef}
				align="left"
				role="listbox"
				className="animate-popover-in min-w-[12rem] max-w-[18rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]"
			>
					<div className="max-h-64 overflow-y-auto">
						{options.length === 0 ? (
							<p className="px-3 py-2 text-[11px] text-[var(--color-ink-400)]">
								Nothing to filter.
							</p>
						) : (
							options.map((option) => {
								const isSelected = selected.includes(option.value);
								return (
									<button
										key={option.value}
										type="button"
										role="option"
										aria-selected={isSelected}
										onClick={() => toggle(option.value)}
										className={classNames(
											"flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors",
											isSelected
												? "bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-900)]"
												: "text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
										)}
									>
										<span className="flex min-w-0 items-center gap-2">
											<span
												aria-hidden
												className={classNames(
													"grid size-3.5 shrink-0 place-items-center border transition-colors",
													single ? "rounded-full" : "rounded-[var(--radius-sm)]",
													isSelected
														? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
														: "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
												)}
											>
												{isSelected ? (
													single ? (
														<span className="size-1.5 rounded-full bg-white" />
													) : (
														<Check size={8} strokeWidth={3} />
													)
												) : null}
											</span>
											<span className="truncate">{option.label}</span>
										</span>
										{typeof option.count === "number" ? (
											<span className="shrink-0 tabular-nums text-[10px] text-[var(--color-ink-400)]">
												{option.count}
											</span>
										) : null}
									</button>
								);
							})
						)}
					</div>
					{!single && activeCount > 0 ? (
						<div className="border-t border-[var(--color-ink-100)] px-3 py-1.5 text-right">
							<button
								type="button"
								onClick={clear}
								className="text-[10px] font-semibold text-[var(--color-accent-700)] hover:underline"
							>
								Clear ({activeCount})
							</button>
						</div>
					) : null}
			</Popover>
		</div>
	);
}
