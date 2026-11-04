import React from 'react';
import { TenantProfile } from '../types';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  currentTenant: TenantProfile;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  currentTenant,
}) => {
  // Format upcoming due date based on rentDueDateDay
  const getNextDueDateFormatted = (dueDay: number) => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // If today is past the due day, next due date is next month
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    if (currentDay > dueDay) {
      targetMonth = (currentMonth + 1) % 12;
      if (targetMonth === 0) targetYear += 1;
    }

    const dayStr = String(dueDay).padStart(2, '0');
    return `${dayStr} ${monthNames[targetMonth]} ${targetYear}`;
  };

  const formattedDueDate = getNextDueDateFormatted(currentTenant.rentDueDateDay);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 pb-2">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg text-left sm:text-right shrink-0 shadow-xs self-start sm:self-auto">
        <p className="text-[10px] uppercase font-bold text-amber-600 tracking-tight">
          Jatuh Tempo Berikutnya
        </p>
        <p className="text-lg font-bold text-amber-700 font-mono">
          {formattedDueDate}
        </p>
      </div>
    </div>
  );
};
