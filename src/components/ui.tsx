"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

export function SelectControl({ label, icon, value, onChange, children, className = "" }: { label: string; icon?: string; value: string; onChange: (value: string) => void; children: ReactNode; className?: string }) {
  return <label className={`select-control ${className}`}>{icon && <Icon name={icon} size={16}/>}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select><Icon name="chevron" size={14} className="select-chevron"/></label>;
}
export function Modal({ children, title, onClose, className = "" }: { children: ReactNode; title: string; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; const prev = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; el?.showModal(); document.body.style.overflow = "hidden"; return () => { el?.close(); document.body.style.overflow = overflow; prev?.focus({ preventScroll: true }); }; }, []);
  return <dialog ref={ref} aria-label={title} className={`modal ${className}`} onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose(); } }}><div className="modal-inner">{children}</div></dialog>;
}
export function CloseButton({ onClick }: { onClick: () => void }) { return <button className="icon-button close-button" onClick={onClick} aria-label="Close dialog"><Icon name="close" size={18}/></button>; }
export function EmptyState({ icon = "search", title, description, children }: { icon?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={26}/></div><h3>{title}</h3><p>{description}</p>{children}</div>;
}
export function SectionIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow"><i/>{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
