'use client';

import { Menu } from 'lucide-react';

type DashboardNavbarProps = {
  onMenuClick: () => void;
};

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  return (
    <header>
      <button
        type="button"
        aria-label="Abrir navegacion lateral"
        onClick={onMenuClick}
        className="grid h-7 w-7 place-items-center rounded-md border border-icon-button-border bg-icon-button text-icon-button-text transition-colors hover:bg-icon-button-hover lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>
    </header>
  );
}
