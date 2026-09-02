"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { Modal } from "@/components/shared/modal";
import { REPORTS, REPORT_CATEGORIES, type ReportData } from "@/components/reports/report-registry";

export function ReportsCenterClient({ reportData, isAllCampuses }: { reportData: ReportData; isAllCampuses: boolean }) {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const entries = Object.entries(REPORTS);

  return (
    <div>
      <PageHeader
        title="Reports Center"
        description={
          isAllCampuses
            ? "Generate and export detailed reports across every module."
            : "Generate and export detailed reports for this campus."
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {REPORT_CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary-container/20 text-secondary flex items-center justify-center">
                <Icon name={cat.icon} className="h-5 w-5" />
              </div>
              <h3 className="text-title-lg font-semibold text-on-surface">{cat.key}</h3>
            </div>
            <ul className="space-y-1 flex-1">
              {entries
                .filter(([, r]) => r.category === cat.key)
                .map(([key, r]) => (
                  <li key={key}>
                    <button
                      onClick={() => setActiveReport(key)}
                      className="group w-full cursor-pointer rounded-md hover:bg-surface-container-low transition-colors px-2 py-2 -mx-2 flex items-center justify-between text-left"
                    >
                      <span className="text-body-md text-on-surface">{r.title}</span>
                      <ChevronRight className="h-4 w-4 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={!!activeReport}
        onOpenChange={(open) => !open && setActiveReport(null)}
        title={activeReport ? REPORTS[activeReport].title : ""}
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {activeReport && REPORTS[activeReport].render(reportData)}
      </Modal>
    </div>
  );
}
