import React from 'react';
import {
  Building2,
  Phone,
  CreditCard,
  MapPin,
  Clock,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  Lock,
  LogOut,
  Calendar,
  Zap,
  Wrench,
  Fan,
  Receipt,
  Heart,
} from 'lucide-react';
import { TenantProfile, AppSettings, AuthSession } from '../types';
import { ActiveScreen } from './AppLauncherGrid';
import { buildWaLink } from '../utils/whatsappHelper';

interface AppFooterProps {
  settings: AppSettings;
  currentTenant: TenantProfile;
  authSession?: AuthSession | null;
  onNavigateScreen: (screen: ActiveScreen) => void;
  onLogout: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({
  settings,
  currentTenant,
  authSession,
  onNavigateScreen,
  onLogout,
}) => {
  const currentYear = new Date().getFullYear();

  // Create friendly WhatsApp consultation link
  const waHelpMessage = `Halo ${settings.adminName}, saya ingin bertanya mengenai informasi Acarya Kost atau kendala di kamar saya.`;
  const waHelpLink = buildWaLink(settings.adminPhone || '6281353746248', waHelpMessage);

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-12 transition-all">
      {/* Top Banner Accent */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />

      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & About */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white tracking-tight">
                  Acarya<span className="text-indigo-400">Kost</span>
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Hunian Kost Modern & Nyaman
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Sistem pembayaran sewa kost mandiri, pencatatan stand meter listrik kWh transparan, dan pemeliharaan fasilitas berkala.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-[11px]">Sistem Tagihan Privat Per Kamar</span>
            </div>
          </div>

          {/* Col 2: Informasi Cabang */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-400" />
              <span>Lokasi Cabang Acarya</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span>Acarya Kost 1 (Lokasi 1)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Jl. Acarya I No. 10 • 11 Kamar Kost (01 - 11)
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Acarya Kost 2 (Lokasi 2)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Jl. Acarya II No. 25 • 18 Kamar Kost (01 - 18)
                </p>
              </div>
            </div>
          </div>

          {/* Col 3: Rekening Pembayaran Resmi */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>Rekening Pembayaran</span>
            </h4>

            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Bank BRI (Transfer / BRImo)
                </span>
                <span className="text-sm font-mono font-bold text-white tracking-wider block mt-0.5">
                  {settings.briAccountNo || '0088 0101 1595 503'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  a.n. <strong className="text-slate-200">{settings.briAccountName || 'BOS ACARYA'}</strong>
                </span>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px] text-amber-300">
                <span>💵</span>
                <span>Juga menerima pembayaran tunai (Cash)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateScreen('metode_bayar')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Lihat Detail Rekening & QRIS</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Col 4: Layanan Pengelola & Bantuan */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Bantuan & Kontak</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Pelayanan: 07:00 - 21:00 WITA</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pengelola: <strong className="text-white">{settings.adminName || 'BOS ACARYA'}</strong>
              </p>
            </div>

            <a
              href={waHelpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Pengelola Kost</span>
            </a>

            <p className="text-[10px] text-slate-500 text-center">
              Lapor kendala fasilitas, kran air, servis AC, atau konfirmasi bukti transfer
            </p>
          </div>
        </div>

        {/* Quick Links Menu Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Akses Menu Cepat:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-300">
              <button
                type="button"
                onClick={() => onNavigateScreen('sewa_kost')}
                className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bayar Sewa</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('listrik_kwh')}
                className="hover:text-sky-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Listrik kWh</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('jadwal_fasilitas')}
                className="hover:text-teal-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Wrench className="w-3.5 h-3.5 text-teal-400" />
                <span>Fasilitas</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('servis_ac')}
                className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Fan className="w-3.5 h-3.5 text-blue-400" />
                <span>Servis AC</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('metode_bayar')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Metode Bayar</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateScreen('riwayat_bayar')}
                className="hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Receipt className="w-3.5 h-3.5 text-purple-400" />
                <span>Riwayat Bayar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Session Info */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
            <span>© {currentYear} Acarya Kost. Hak Cipta Dilindungi.</span>
            <span className="hidden sm:inline">•</span>
            <span>Aplikasi KostPay v2.5</span>
          </div>

          {/* Current Auth Status & Logout */}
          <div className="flex items-center gap-3">
            {authSession?.role === 'tenant' ? (
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  Login: <strong>Kamar {currentTenant.roomNumber}</strong> ({currentTenant.name})
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                  title="Keluar dari akun kamar"
                >
                  Keluar
                </button>
              </div>
            ) : authSession?.role === 'admin' ? (
              <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-[11px] text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>
                  Login: <strong>Pengelola Kost (Admin)</strong>
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                  title="Keluar dari mode admin"
                >
                  Keluar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
};
