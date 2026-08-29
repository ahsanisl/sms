"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: number;
}

/** Card chrome around a Recharts chart — replaces Stitch's "simulated chart" divs. */
export function ChartCard({ title, action, children, className, height = 256 }: ChartCardProps) {
  return (
    <div className={cn("bg-surface border border-outline-variant rounded-xl p-lg card-shadow", className)}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-title-lg font-semibold text-primary">{title}</h3>
        {action ?? (
          <DropdownMenu>
            <DropdownMenuTrigger className="text-on-surface-variant hover:text-primary outline-none">
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4" /> Export chart
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Maximize2 className="h-4 w-4" /> View full screen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );
}
