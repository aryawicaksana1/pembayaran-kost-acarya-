import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Search,
  Copy,
  Check,
  MapPin,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { TenantProfile, KostLocation, AuthSession } from '../types';
import { formatRupiah } from '../utils/whatsappHelper';

interface LoginPageProps {
  tenants: TenantProfile[];
  onLoginSuccess: (session: AuthSession, tenant?: TenantProfile) => void;
  selectedLocation: KostLocation | 'all';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  tenants,
  onLoginSuccess,
  selectedLocation: initialLocation,
}) => {
  const [authTab, setAuthTab] = useState<'tenant' | 'admin'>('tenant');

  // Tenant login form state
  const [selectedBranch, setSelectedBranch] = useState<KostLocation>(
    initialLocation === 'acarya_1' ? 'acarya_1' : 'acarya_2'
  );
  const [tenantIdentifier, setTenantIdentifier] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  const [showTenantPassword, setShowTenantPassword] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  // Admin login form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Help modal for owner to see accounts list
  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter tenants for the help modal
  const helpFilteredTenants = tenants.filter((t) => {
    if (!searchAccountQuery) return true;
    const q = searchAccountQuery.toLowerCase();
    return (
      t.roomNumber.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      (t.username && t.username.toLowerCase().includes(q)) ||
      (t.kostLocation && t.kostLocation.toLowerCase().includes(q))
    );
  });

  const handleCopyCredentials = (t: TenantProfile) => {
    const branchName = t.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';
    const text = `*AKUN LOGIN KOSTPAY - ${branchName.toUpperCase()}*\n\nHalo ${t.name},\nBerikut akses login untuk dasbor tagihan sewa & listrik kamar Anda:\n\n🏢 Cabang: ${branchName}\n🚪 Kamar: ${t.roomNumber}\n👤 Username: ${t.username || `kamar${t.roomNumber}`}\n🔑 Password: ${t.password || `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`}\n\nSilakan simpan data ini dan jangan dibagikan ke orang lain ya. Terima kasih!`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handler for tenant login
  const handleTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTenantError(null);

    const inputUser = tenantIdentifier.trim().toLowerCase();
    const inputPass = tenantPassword.trim();

    if (!inputUser || !inputPass) {
      setTenantError('Silakan masukkan Nomor Kamar / Username dan Password.');
      return;
    }

    // Extract digits or clean string
    // e.g. "kamar 02", "kamar02", "02", "2"
    const cleanedDigits = inputUser.replace(/\D/g, '');
    const paddedRoom = cleanedDigits ? cleanedDigits.padStart(2, '0') : '';

    // Search for matching tenant in the selected branch
    const matchedTenant = tenants.find((t) => {
      if (t.kostLocation !== selectedBranch) return false;

      const roomMatch =
        t.roomNumber.toLowerCase() === inputUser ||
        (paddedRoom && t.roomNumber === paddedRoom) ||
        (t.username && t.username.toLowerCase() === inputUser);

      return roomMatch;
    });

    if (!matchedTenant) {
      setTenantError(
        `Kamar/Username "${tenantIdentifier}" tidak ditemukan di ${
          selectedBranch === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'
        }. Periksa kembali nomor kamar Anda.`
      );
      return;
    }

    // Verify password
    const validPassword =
      matchedTenant.password ||
      `acarya${matchedTenant.kostLocation === 'acarya_2' ? '2' : '1'}-${matchedTenant.roomNumber}`;

    if (inputPass !== validPassword) {
      setTenantError(
        `Password salah untuk Kamar ${matchedTenant.roomNumber}. Silakan periksa kembali atau tanyakan ke pengelola kost.`
      );
      return;
    }

    // Success!
    setIsSuccess(true);
    setSuccessMessage(`Selamat datang, ${matchedTenant.name} (Kamar ${matchedTenant.roomNumber})!`);

    setTimeout(() => {
      onLoginSuccess(
        {
          role: 'tenant',
          tenantId: matchedTenant.id,
          username: matchedTenant.username || `kamar${matchedTenant.roomNumber}`,
          name: matchedTenant.name,
          roomNumber: matchedTenant.roomNumber,
          kostLocation: matchedTenant.kostLocation,
        },
        matchedTenant
      );
    }, 600);
  };

  // Handler for admin login
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const u = adminUsername.trim();
    const p = adminPassword.trim();

    if (!u || !p) {
      setAdminError('Silakan masukkan username dan password admin.');
      return;
    }

    if (u === 'bosacarya' && p === 'bosacarya1') {
      setIsSuccess(true);
      setSuccessMessage('Login Pengelola Kost Berhasil!');
      setTimeout(() => {
        onLoginSuccess({
          role: 'admin',
          username: 'bosacarya',
          name: 'BOS ACARYA (Pengelola)',
        });
      }, 600);
    } else {
      setAdminError('Username atau password admin salah. Kredensial tidak valid.');
    }
  };

  // Quick fill helper for review
  const handleQuickFillTenant = (roomNum: string, branch: KostLocation) => {
    setSelectedBranch(branch);
    setTenantIdentifier(`kamar${roomNum}`);
    setTenantPassword(`acarya${branch === 'acarya_2' ? '2' : '1'}-${roomNum}`);
    setTenantError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background visual ambience */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand & App Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/20 border border-indigo-400/30 mb-1">
            <Building2 className="w-7 h-7 text-indigo-200" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Acarya<span className="text-indigo-400">Kost</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Portal Pembayaran Sewa & Listrik kWh Mandiri
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dasbor Privat Tiap Kamar</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 overflow-hidden">
          {/* Navigation Role Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAuthTab('tenant');
                setTenantError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authTab === 'tenant'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span>Penghuni Kamar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('admin');
                setAdminError(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authTab === 'admin'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Pengelola (Admin)</span>
            </button>
          </div>

          {/* Card Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Global Success State */}
            {isSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}

            {/* TAB 1: TENANT LOGIN */}
            {authTab === 'tenant' && !isSuccess && (
              <form onSubmit={handleTenantSubmit} className="space-y-4">
                {/* Information Callout */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Tarif sewa dan tagihan tiap kamar berbeda dan dijaga kerahasiaannya. Masuk dengan akun kamar Anda untuk melihat rincian tagihan Anda.
                  </p>
                </div>

                {tenantError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{tenantError}</span>
                  </div>
                )}

                {/* Branch Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pilih Cabang Kost</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch('acarya_1');
                        setTenantError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                        selectedBranch === 'acarya_1'
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-2xs ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <div>
                        <div className="font-bold">Acarya Kost 1</div>
                        <div className="text-[10px] text-slate-500 font-normal">11 Kamar (01-11)</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranch('acarya_2');
                        setTenantError(null);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                        selectedBranch === 'acarya_2'
                          ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-2xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <div>
                        <div className="font-bold">Acarya Kost 2</div>
                        <div className="text-[10px] text-slate-500 font-normal">18 Kamar (01-18)</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Username / Room Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor Kamar atau Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-tenant-user"
                      type="text"
                      value={tenantIdentifier}
                      onChange={(e) => setTenantIdentifier(e.target.value)}
                      placeholder="Contoh: kamar02 atau 02"
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-900"
                      autoComplete="username"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Bisa ketik angka kamar (misal: <strong>02</strong>) atau format username (<strong>kamar02</strong>)
                  </p>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password Kamar
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-tenant-password"
                      type={showTenantPassword ? 'text' : 'password'}
                      value={tenantPassword}
                      onChange={(e) => setTenantPassword(e.target.value)}
                      placeholder="Masukkan password kamar Anda"
                      className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-900"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTenantPassword(!showTenantPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showTenantPassword ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showTenantPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Password default: <strong>acarya{selectedBranch === 'acarya_2' ? '2' : '1'}-02</strong> (sesuai nomor kamar)
                  </p>
                </div>

                {/* Submit Tenant Button */}
                <button
                  id="btn-login-tenant"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Masuk ke Dasbor Kamar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Quick Auto-Fill Chips for easy demo */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Contoh Kamar Pengujian:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickFillTenant('02', 'acarya_2')}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer border border-slate-200"
                    >
                      Kost 2 • Kamar 02
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillTenant('03', 'acarya_2')}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer border border-slate-200"
                    >
                      Kost 2 • Kamar 03
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillTenant('06', 'acarya_2')}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer border border-slate-200"
                    >
                      Kost 2 • Kamar 06
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillTenant('01', 'acarya_1')}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer border border-slate-200"
                    >
                      Kost 1 • Kamar 01
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: ADMIN LOGIN */}
            {authTab === 'admin' && !isSuccess && (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Akses khusus Pengelola / Pemilik Kost untuk memeriksa semua kamar, verifikasi struk transfer, mengelola akun kamar, dan Google Sheets.
                  </p>
                </div>

                {adminError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Admin Username Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Username Pengelola
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-admin-user"
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Masukkan username pengelola (bosacarya)"
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-900"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Admin Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password Pengelola
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-admin-password"
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Masukkan password admin (bosacarya1)"
                      className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all text-slate-900"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showAdminPassword ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Admin Button */}
                <button
                  id="btn-login-admin"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk Panel Pengelola (Admin)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Quick Fill Admin Button */}
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsername('bosacarya');
                    setAdminPassword('bosacarya1');
                    setAdminError(null);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Otomatis Isi Akun Admin: <span className="font-mono text-indigo-700">bosacarya / bosacarya1</span>
                </button>
              </form>
            )}
          </div>

          {/* Footer Trigger for Owner's Account Help Modal */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Lupa akun kamar?</span>
            <button
              type="button"
              onClick={() => setIsAccountListOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Daftar Akun & Password Kamar</span>
            </button>
          </div>
        </div>

        {/* Info footer */}
        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Acarya Kost • Sistem Pembayaran & Manajemen Kamar
        </p>
      </div>

      {/* MODAL: DAFTAR AKUN & PASSWORD KAMAR (UNTUK PEMILIK KOST) */}
      <AnimatePresence>
        {isAccountListOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col text-slate-900 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-xs">
                    <KeyRound className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Daftar Akun & Password Kamar
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gunakan daftar ini untuk memberikan username & password kepada masing-masing penghuni
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountListOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nomor kamar, nama penghuni, atau username..."
                    value={searchAccountQuery}
                    onChange={(e) => setSearchAccountQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Accounts Scrollable List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {helpFilteredTenants.map((t) => {
                  const defaultUser = t.username || `kamar${t.roomNumber}`;
                  const defaultPass =
                    t.password ||
                    `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`;
                  const isCopied = copiedId === t.id;

                  return (
                    <div
                      key={t.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              t.kostLocation === 'acarya_2'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {t.kostLocation === 'acarya_2' ? 'Acarya 2' : 'Acarya 1'}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900">
                            Kamar {t.roomNumber}
                          </span>
                          <span className="font-semibold text-slate-600">
                            • {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          <span>
                            User: <strong className="text-slate-800">{defaultUser}</strong>
                          </span>
                          <span>
                            Pass: <strong className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded-sm">{defaultPass}</strong>
                          </span>
                          <span className="text-slate-400 font-sans">
                            Tarif: {formatRupiah(t.monthlyRentRate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('tenant');
                            setSelectedBranch(t.kostLocation || 'acarya_2');
                            setTenantIdentifier(defaultUser);
                            setTenantPassword(defaultPass);
                            setIsAccountListOpen(false);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Gunakan Login
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(t)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Salin format pesan WhatsApp untuk dikirimkan ke penghuni"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin Format WA</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Total: {helpFilteredTenants.length} akun kamar
                </span>
                <button
                  type="button"
                  onClick={() => setIsAccountListOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
