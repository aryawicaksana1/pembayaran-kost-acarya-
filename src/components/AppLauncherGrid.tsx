import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Zap,
  Wrench,
  Fan,
  CreditCard,
  MessageCircle,
  Receipt,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { TenantProfile, AppSettings, AuthSession } from '../types';
import { formatRupiah } from '../utils/whatsappHelper';

export type ActiveScreen =
  | 'home'
  | 'sewa_kost'
  | 'listrik_kwh'
  | 'jadwal_fasilitas'
  | 'servis_ac'
  | 'metode_bayar'
  | 'pengingat_wa'
  | 'riwayat_bayar'
  | 'admin_kost'
  | 'google_sheets';

export const ADMIN_ONLY_SCREENS: ActiveScreen[] = [
  'pengingat_wa',
  'admin_kost',
  'google_sheets',
];

interface AppLauncherGridProps {
  currentTenant: TenantProfile;
  settings: AppSettings;
  onOpenScreen: (screen: ActiveScreen) => void;
  isLoggedIn: boolean;
  onRequireLogin: (targetScreen: ActiveScreen) => void;
  onLogout: () => void;
  authSession?: AuthSession | null;
  pendingRentCount?: number;
  pendingElectricityCount?: number;
  acServiceDueCount?: number;
}

export const AppLauncherGrid: React.FC<AppLauncherGridProps> = ({
  currentTenant,
  settings,
  onOpenScreen,
  isLoggedIn,
  onRequireLogin,
  onLogout,
  authSession,
  pendingRentCount = 1,
  pendingElectricityCount = 1,
  acServiceDueCount = 1,
}) => {
  // Menu items crafted to match the user's reference image visual archetype
  const menuItems = [
    {
      id: 'sewa_kost' as ActiveScreen,
      title: 'Sewa Kost',
      subtitle: 'Bulanan / Tahunan',
      icon: Calendar,
      gradient: 'from-indigo-600 via-indigo-500 to-blue-500',
      shadowColor: 'shadow-indigo-500/25',
      badge: currentTenant.activeRentStatus === 'jatuh_tempo' ? 'Jatuh Tempo' : undefined,
      badgeColor: 'bg-red-500',
      dotColor: '#6366F1',
    },
    {
      id: 'listrik_kwh' as ActiveScreen,
      title: 'Listrik kWh',
      subtitle: 'Awal-Akhir + Mesin',
      icon: Zap,
      gradient: 'from-blue-600 via-sky-500 to-cyan-400',
      shadowColor: 'shadow-sky-500/25',
      badge: 'Input kWh',
      badgeColor: 'bg-sky-600',
      dotColor: '#0EA5E9',
    },
    {
      id: 'jadwal_fasilitas' as ActiveScreen,
      title: 'Fasilitas',
      subtitle: 'Mingguan & Cek 6 Bln',
      icon: Wrench,
      gradient: 'from-cyan-500 via-teal-500 to-emerald-500',
      shadowColor: 'shadow-teal-500/25',
      badge: 'Rutin',
      badgeColor: 'bg-teal-600',
      dotColor: '#14B8A6',
    },
    {
      id: 'servis_ac' as ActiveScreen,
      title: 'Servis AC',
      subtitle: 'Tiap 6 Bulan Sekali',
      icon: Fan,
      gradient: 'from-sky-500 via-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/25',
      badge: acServiceDueCount > 0 ? 'Perlu Cuci' : 'Normal',
      badgeColor: acServiceDueCount > 0 ? 'bg-amber-500' : 'bg-emerald-500',
      dotColor: '#38BDF8',
    },
    {
      id: 'metode_bayar' as ActiveScreen,
      title: 'Metode Bayar',
      subtitle: 'Bank BRI & Cash',
      icon: CreditCard,
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
      shadowColor: 'shadow-amber-500/25',
      badge: 'BRI & Tunai',
      badgeColor: 'bg-amber-600',
      dotColor: '#F59E0B',
    },
    {
      id: 'pengingat_wa' as ActiveScreen,
      title: 'Notifikasi WA',
      subtitle: 'Kirim Pengingat Tagihan',
      icon: MessageCircle,
      gradient: 'from-emerald-500 via-green-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/25',
      badge: 'Admin',
      badgeColor: 'bg-emerald-600',
      dotColor: '#10B981',
      requiresAdmin: true,
    },
    {
      id: 'riwayat_bayar' as ActiveScreen,
      title: 'Riwayat Bayar',
      subtitle: authSession?.role === 'tenant' ? 'Status Bayar Saya' : 'Bukti & Status',
      icon: Receipt,
      gradient: 'from-purple-600 via-violet-600 to-indigo-600',
      shadowColor: 'shadow-purple-500/25',
      badge: 'Status',
      badgeColor: 'bg-purple-600',
      dotColor: '#8B5CF6',
      requiresAdmin: false,
    },
    {
      id: 'admin_kost' as ActiveScreen,
      title: 'Admin Kost',
      subtitle: 'Cek & Verifikasi',
      icon: ShieldCheck,
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      shadowColor: 'shadow-orange-500/25',
      badge: 'Admin',
      badgeColor: 'bg-orange-600',
      dotColor: '#F97316',
      requiresAdmin: true,
    },
    {
      id: 'google_sheets' as ActiveScreen,
      title: 'Google Sheet',
      subtitle: 'Kode Apps Script',
      icon: FileSpreadsheet,
      gradient: 'from-emerald-600 via-teal-600 to-green-600',
      shadowColor: 'shadow-green-500/25',
      badge: 'Admin',
      badgeColor: 'bg-emerald-700',
      dotColor: '#059669',
      requiresAdmin: true,
    },
  ];

  // Menu notifikasi dan fitur admin hanya bisa diakses dan dilihat oleh admin
  const visibleMenuItems = menuItems.filter((item) => {
    if (authSession?.role === 'tenant') {
      return !item.requiresAdmin;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Tenant Status Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-xl p-5 sm:p-6 shadow-sm border border-indigo-900/50 relative overflow-hidden">
        {/* Subtle ambient accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                currentTenant.kostLocation === 'acarya_2'
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                  : 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
              }`}>
                {currentTenant.kostLocation === 'acarya_2' ? '🏢 Acarya Kost 2' : '🏢 Acarya Kost 1'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-900/80 text-indigo-200 border border-indigo-700/60">
                Kamar {currentTenant.roomNumber}
              </span>
              <span className="text-xs text-indigo-300">
                Jatuh tempo tgl {currentTenant.rentDueDateDay}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Halo, {currentTenant.name} 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
              Tarif sewa: <span className="text-white font-semibold">{formatRupiah(currentTenant.monthlyRentRate)}</span>/bulan • Listrik kWh (+Rp 30rb mesin).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-quick-rent"
              type="button"
              onClick={() => onOpenScreen('sewa_kost')}
              className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Bayar Sewa</span>
            </button>
            <button
              id="btn-quick-electricity"
              type="button"
              onClick={() => onOpenScreen('listrik_kwh')}
              className="px-4 py-2.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-900 text-white text-xs sm:text-sm font-bold border border-indigo-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Input Listrik</span>
            </button>
            {authSession?.role === 'tenant' && (
              <button
                type="button"
                onClick={onLogout}
                className="px-3.5 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari akun kamar"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Pills Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-indigo-900/50 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentTenant.activeRentStatus === 'lunas' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-indigo-200">Sewa Kost:</span>
            <span className="font-semibold text-white capitalize">{currentTenant.activeRentStatus.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${currentTenant.activeElectricityStatus === 'lunas' ? 'bg-emerald-400' : 'bg-sky-400 animate-pulse'}`} />
            <span className="text-indigo-200">Listrik Bulan Ini:</span>
            <span className="font-semibold text-white capitalize">{currentTenant.activeElectricityStatus.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
            <Clock className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-indigo-200">Google Sheet:</span>
            <span className="font-medium text-emerald-300">
              {settings.googleWebAppUrl ? 'Terhubung' : 'Siap Hubung'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Access / Tenant Private Banner */}
      {isLoggedIn ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-emerald-950">
                  Status: <span className="text-emerald-700 font-semibold">Pengelola Kost (Admin)</span>
                </p>
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  Admin Aktif
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Semua menu khusus (Pengingat WA, Riwayat Bayar, Admin Kost, dan Google Sheet) dapat diakses penuh.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenScreen('admin_kost')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Buka Panel Admin
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      ) : authSession?.role === 'tenant' ? (
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-900 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-950">
                Mode Dasbor Privat: Kamar {currentTenant.roomNumber} ({currentTenant.name})
              </p>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                Data tarif sewa, stand meter listrik, dan riwayat pembayaran Anda bersifat privat dan terlindungi dari kamar lain.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Keluar Akun
          </button>
        </div>
      ) : (
        <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Akses Terbatas: Pengingat WA, Admin Kost & Google Sheet
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hanya dapat diakses setelah login dengan akun pengelola kost yang berwenang.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRequireLogin('admin_kost')}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Pengelola</span>
          </button>
        </div>
      )}

      {/* Grid Menu Title & Info */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">
          Menu Layanan & Pembayaran
        </h3>
        <p className="text-xs text-slate-500">
          Pilih menu untuk pembayaran sewa, input stand meter listrik kWh, cek fasilitas, atau servis AC
        </p>
      </div>

      {/* The Mobile Launcher Grid styled with Professional Polish cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {visibleMenuItems.map((item) => {
          const IconComponent = item.icon;
          const isLocked = item.requiresAdmin && !isLoggedIn;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => {
                if (isLocked) {
                  onRequireLogin(item.id);
                } else {
                  onOpenScreen(item.id);
                }
              }}
              className={`bg-white rounded-xl shadow-xs border p-4 sm:p-5 flex flex-col items-center justify-center relative cursor-pointer group transition-all select-none ${
                isLocked
                  ? 'border-slate-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
              }`}
              id={`menu-card-${item.id}`}
            >
              {/* Badge if locked or has custom badge */}
              {isLocked ? (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-sm text-[9px] font-bold text-white shadow-2xs bg-amber-600 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Khusus Admin</span>
                </span>
              ) : item.badge ? (
                <span
                  className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-sm text-[9px] font-bold text-white shadow-2xs ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              ) : null}

              {/* Icon Container with subtle polish */}
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-sm ${item.shadowColor} mb-3 group-hover:scale-105 transition-transform relative`}
              >
                <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-xs" />
                {isLocked && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-white text-amber-400 flex items-center justify-center shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* Text Label Below Card */}
              <div className="text-center w-full px-1">
                <span className="block text-sm font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </span>
                <span className="block text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {isLocked ? 'Khusus pengelola kost' : item.subtitle}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Tips & Reminder Bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 sm:p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold mb-0.5">Informasi Pembayaran & Verifikasi:</p>
          <p>
            Semua pembayaran via <strong>Transfer Bank BRI</strong> wajib menyertakan foto/screenshot bukti transfer. Untuk pembayaran <strong>Cash (Tunai)</strong> tidak memerlukan bukti dan langsung dikonfirmasi ke pengelola kost.
          </p>
        </div>
      </div>
    </div>
  );
};
