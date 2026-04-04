import clsx from "clsx";
import type { PropsWithChildren, ReactNode } from "react";

type PageHeaderProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  aside?: ReactNode;
}>;

export function PageHeader({ eyebrow, title, description, className, aside, children }: PageHeaderProps) {
  return (
    <div className={clsx("mb-10 flex flex-col gap-4 border-b border-[var(--cream-3)] pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--ink-40)]">{eyebrow}</p>
        <h1 className="display mb-3 text-4xl text-[var(--ink)] md:text-5xl">{title}</h1>
        <p className="text-sm leading-7 text-[var(--ink-60)]">{description}</p>
        {children}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
