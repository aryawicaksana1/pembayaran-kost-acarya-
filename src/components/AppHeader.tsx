import React from 'react';
import { Menu, ShieldCheck, UserCheck, BellRing, Building2, LogIn, LogOut, Lock, DoorClosed } from 'lucide-react';
import { TenantProfile, AppSettings, KostLocation, AuthSession } from '../types';

interface AppHeaderProps {
  currentTenant: TenantProfile;
  tenants: TenantProfile[];
  onSelectTenant: (tenant: TenantProfile) => void;
  isAdminMode: boolean;
  onToggleAdminMode: (isAdmin: boolean) => void;
  isLoggedIn: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
  settings: AppSettings;
  onOpenWhatsAppReminders: () => void;
  onOpenGoogleSheets: () => void;
  onOpenMobileMenu?: () => void;
  selectedLocation?: KostLocation | 'all';
  onSelectLocation?: (loc: KostLocation | 'all') => void;
  authSession?: AuthSession | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentTenant,
  tenants,
  onSelectTenant,
  isAdminMode,
  onToggleAdminMode,
  isLoggedIn,
  onOpenLogin,
  onLogout,
  settings,
  onOpenWhatsAppReminders,
  onOpenGoogleSheets,
  onOpenMobileMenu,
  selectedLocation,
  onSelectLocation,
  authSession,
}) => {
  // Filter tenants by selectedLocation if not 'all'
  const visibleTenants =
    selectedLocation === 'all'
      ? tenants
      : tenants.filter((t) => t.kostLocation === selectedLocation);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="px-3 sm:px-6 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Top row: Brand & Mobile Menu */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onOpenMobileMenu && (
                <button
                  type="button"
                  onClick={onOpenMobileMenu}
                  className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden cursor-pointer"
                  title="Buka Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-950 flex items-center justify-center text-white shadow-xs">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                      Acarya<span className="text-indigo-600">Kost</span>
                    </h1>
                    <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      {isLoggedIn ? 'Admin Kost' : `Kmr ${currentTenant.roomNumber}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                    {currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2 • Lokasi 2' : 'Acarya Kost 1 • Lokasi 1'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop & Mobile Responsive Controls */}
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
            {/* Tenant Controls vs Admin Controls */}
            {authSession?.role === 'tenant' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-bold max-w-[180px] xs:max-w-[240px] truncate shadow-2xs">
                  <DoorClosed className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Kamar {currentTenant.roomNumber}</span>
                </div>
                <button
                  id="btn-logout-tenant"
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer shrink-0"
                  title="Keluar dari dasbor kamar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : isLoggedIn ? (
              <>
                {/* Admin Room Switcher: Gunakan No Kamar saja, tanpa nama */}
                <div className="flex-1 md:flex-none min-w-0 max-w-[200px] xs:max-w-[240px] sm:max-w-xs flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg px-2.5 py-1.5 border border-slate-200 text-xs">
                  <DoorClosed className="w-3.5 h-3.5 text-indigo-600 mr-1.5 shrink-0" />
                  <select
                    value={currentTenant.id}
                    onChange={(e) => {
                      const found = tenants.find((t) => t.id === e.target.value);
                      if (found) onSelectTenant(found);
                    }}
                    className="font-bold text-slate-800 bg-transparent outline-hidden cursor-pointer text-xs w-full truncate"
                    title="Pilih Nomor Kamar"
                  >
                    {visibleTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        [{t.kostLocation === 'acarya_2' ? 'Kost 2' : 'Kost 1'}] Kamar {t.roomNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Admin Mode Toggle & Logout */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="btn-toggle-admin"
                    type="button"
                    onClick={() => onToggleAdminMode(!isAdminMode)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isAdminMode
                        ? 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                    title="Panel Admin Kost"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Admin Kost</span>
                  </button>
                  <button
                    id="btn-logout"
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                    title="Keluar dari mode admin"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                id="btn-login-trigger"
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm cursor-pointer shrink-0"
                title="Login ke KostPay"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}

            {/* WA Notification Button & Google Sheets (Hanya untuk Admin / Pengelola) */}
            {isLoggedIn && (
              <>
                <button
                  id="btn-header-wa"
                  type="button"
                  onClick={onOpenWhatsAppReminders}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Sistem Notifikasi WhatsApp Penghuni (Khusus Admin)"
                >
                  <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Notifikasi WA</span>
                </button>

                <button
                  id="btn-header-sheets"
                  type="button"
                  onClick={onOpenGoogleSheets}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Integrasi Google Sheets & Apps Script"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Sheets</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
