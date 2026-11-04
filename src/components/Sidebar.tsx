import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Zap,
  Wrench,
  Fan,
  CreditCard,
  MessageCircle,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  X,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { TenantProfile, AppSettings } from '../types';
import { ActiveScreen } from './AppLauncherGrid';

interface SidebarProps {
  currentTenant: TenantProfile;
  tenants: TenantProfile[];
  onSelectTenant: (tenant: TenantProfile) => void;
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  isAdminMode: boolean;
  onToggleAdminMode: (isAdmin: boolean) => void;
  settings: AppSettings;
  onCloseMobile?: () => void;
  pendingRentCount?: number;
  pendingElectricityCount?: number;
  acServiceDueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTenant,
  tenants,
  onSelectTenant,
  activeScreen,
  onNavigate,
  isAdminMode,
  onToggleAdminMode,
  settings,
  onCloseMobile,
  pendingRentCount = 0,
  pendingElectricityCount = 0,
  acServiceDueCount = 0,
}) => {
  // Helper to get initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    {
      id: 'home' as ActiveScreen,
      label: 'Dashboard Utama',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'sewa_kost' as ActiveScreen,
      label: 'Bayar Sewa Kost',
      icon: Calendar,
      badge: currentTenant.activeRentStatus === 'jatuh_tempo' ? 'Due' : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'listrik_kwh' as ActiveScreen,
      label: 'Bayar Listrik kWh',
      icon: Zap,
      badge: currentTenant.activeElectricityStatus === 'belum_lunas' ? 'Tagihan' : undefined,
      badgeColor: 'bg-sky-500',
    },
    {
      id: 'jadwal_fasilitas' as ActiveScreen,
      label: 'Jadwal Fasilitas',
      icon: Wrench,
      badge: undefined,
    },
    {
      id: 'servis_ac' as ActiveScreen,
      label: 'Jadwal Servis AC',
      icon: Fan,
      badge: acServiceDueCount > 0 ? acServiceDueCount : undefined,
      badgeColor: 'bg-indigo-500',
    },
    {
      id: 'metode_bayar' as ActiveScreen,
      label: 'Metode Bayar',
      icon: CreditCard,
      badge: 'BRI/Cash',
      badgeColor: 'bg-indigo-600',
    },
    {
      id: 'pengingat_wa' as ActiveScreen,
      label: 'Pengingat WhatsApp',
      icon: MessageCircle,
      badge: 'WA',
      badgeColor: 'bg-emerald-600',
    },
    {
      id: 'riwayat_bayar' as ActiveScreen,
      label: 'Riwayat Transaksi',
      icon: Receipt,
      badge: undefined,
    },
    {
      id: 'admin_kost' as ActiveScreen,
      label: 'Admin Kost',
      icon: ShieldCheck,
      badge: pendingRentCount + pendingElectricityCount > 0 ? pendingRentCount + pendingElectricityCount : undefined,
      badgeColor: 'bg-amber-600',
    },
    {
      id: 'google_sheets' as ActiveScreen,
      label: 'Google Sheet Sync',
      icon: FileSpreadsheet,
      badge: settings.googleWebAppUrl ? 'Sync' : 'Setup',
      badgeColor: settings.googleWebAppUrl ? 'bg-emerald-600' : 'bg-slate-700',
    },
  ];

  return (
    <aside className="w-64 bg-indigo-950 text-slate-100 flex flex-col flex-shrink-0 h-full border-r border-indigo-900/50 select-none">
      {/* Mobile close button */}
      {onCloseMobile && (
        <div className="flex justify-between items-center p-4 border-b border-indigo-900/50 md:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-white text-sm">KostPay Navigation</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-indigo-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* User / Tenant Profile Card */}
      <div className="p-6 flex flex-col items-center border-b border-indigo-900/50 relative">
        <div className="w-16 h-16 rounded-full bg-indigo-500 mb-3 flex items-center justify-center text-2xl font-bold text-white shadow-md shadow-indigo-900/40">
          {getInitials(currentTenant.name)}
        </div>
        <h1 className="text-lg font-semibold text-white text-center leading-tight">
          {currentTenant.name}
        </h1>
        <p className="text-xs text-indigo-300 mt-0.5">
          Kamar {currentTenant.roomNumber} • {currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
        </p>

        {/* Tenant selector switch */}
        <div className="mt-3 w-full">
          <div className="flex items-center justify-between text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-1 px-1">
            <span>Pilih Penghuni</span>
            <span className="text-indigo-400 font-mono">{tenants.length} Kamar</span>
          </div>
          <select
            value={currentTenant.id}
            onChange={(e) => {
              const found = tenants.find((t) => t.id === e.target.value);
              if (found) {
                onSelectTenant(found);
                if (onCloseMobile) onCloseMobile();
              }
            }}
            className="w-full text-xs font-semibold text-indigo-100 bg-indigo-900/80 border border-indigo-800 rounded-lg px-2.5 py-1.5 outline-hidden cursor-pointer hover:bg-indigo-900 transition-colors"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id} className="bg-indigo-950 text-white">
                [{t.kostLocation === 'acarya_2' ? 'Kost 2' : 'Kost 1'}] {t.name} (Kmr {t.roomNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems
          .filter((item) => {
            if (!isAdminMode && (item.id === 'pengingat_wa' || item.id === 'admin_kost' || item.id === 'google_sheets')) {
              return false;
            }
            return true;
          })
          .map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`nav-item-${item.id}`}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-indigo-800 text-white shadow-xs font-medium'
                  : 'hover:bg-indigo-900/70 text-indigo-200'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'opacity-80'}`} />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm text-white shrink-0 ml-1.5 ${
                    item.badgeColor || 'bg-indigo-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Role / Mode Switcher */}
      <div className="px-4 py-2 border-t border-indigo-900/50">
        <button
          type="button"
          onClick={() => onToggleAdminMode(!isAdminMode)}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isAdminMode
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
              : 'bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isAdminMode ? 'Keluar Mode Admin' : 'Masuk Mode Admin'}</span>
        </button>
      </div>

      {/* Sidebar Integration Footer */}
      <div className="p-4 bg-indigo-900/40 text-[10px] space-y-1.5 border-t border-indigo-900/50">
        <p className="font-bold uppercase tracking-wider text-indigo-400">Admin Integration</p>
        <p className="text-indigo-200 flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              settings.googleWebAppUrl ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span>
            {settings.googleWebAppUrl ? 'Connected to Google Sheet' : 'Google Sheet: Siap Hubung'}
          </span>
        </p>
        <p className="text-indigo-200 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>WA Notification: Active ✅</span>
        </p>
      </div>
    </aside>
  );
};
