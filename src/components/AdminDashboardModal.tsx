import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  MessageCircle,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Receipt,
  Search,
  Check,
  Eye,
  MapPin,
  Building2,
  Phone,
  User,
  ExternalLink,
  KeyRound,
  Copy,
  Lock,
  Edit3,
  Share2,
  BellRing,
} from 'lucide-react';
import {
  TenantProfile,
  AppSettings,
  KostPaymentRecord,
  ElectricityRecord,
  KostLocation,
} from '../types';
import { formatRupiah, buildWaLink, generateRentReminderMessage, generateElectricityReminderMessage } from '../utils/whatsappHelper';

interface AdminDashboardModalProps {
  tenants: TenantProfile[];
  settings: AppSettings;
  kostPayments: KostPaymentRecord[];
  electricityPayments: ElectricityRecord[];
  onClose: () => void;
  onVerifyPayment: (
    type: 'kost' | 'electricity',
    id: string
  ) => Promise<{ success: boolean; message: string; sentToSheets: boolean }> | void;
  onOpenGoogleSheetsModal: () => void;
  onOpenWhatsAppModal?: () => void;
  onUpdateTenant?: (updated: TenantProfile) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  tenants,
  settings,
  kostPayments,
  electricityPayments,
  onClose,
  onVerifyPayment,
  onOpenGoogleSheetsModal,
  onOpenWhatsAppModal,
  onUpdateTenant,
}) => {
  const [activeTab, setActiveTab] = useState<'verifikasi' | 'penghuni' | 'akun' | 'rekap'>('verifikasi');
  const [branchFilter, setBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dihuni' | 'tersedia'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewProof, setPreviewProof] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantProfile | null>(null);
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);
  const [toastData, setToastData] = useState<{
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const handleVerifyWithFeedback = async (
    type: 'kost' | 'electricity',
    id: string,
    roomNumber: string,
    tenantName: string
  ) => {
    setIsVerifyingId(id);
    try {
      const res = await onVerifyPayment(type, id);
      if (res && typeof res === 'object') {
        if (res.sentToSheets) {
          setToastData({
            type: 'success',
            title: 'Verifikasi Berhasil & Masuk ke Sheet Kamar!',
            message: res.message,
          });
        } else {
          setToastData({
            type: 'warning',
            title: 'Status Sukses di Aplikasi (Periksa Google Sheets)',
            message: res.message,
          });
        }
      } else {
        setToastData({
          type: 'success',
          title: 'Verifikasi Berhasil',
          message: `Pembayaran Kamar ${roomNumber} (${tenantName}) telah diverifikasi menjadi SUKSES.`,
        });
      }
    } catch (err: any) {
      setToastData({
        type: 'error',
        title: 'Gagal Memproses Verifikasi',
        message: err?.message || 'Terjadi gangguan saat memverifikasi pembayaran.',
      });
    } finally {
      setIsVerifyingId(null);
    }
  };

  // Filtered by branch
  const filteredKostPayments = branchFilter === 'all'
    ? kostPayments
    : kostPayments.filter((p) => (p.kostLocation || 'acarya_1') === branchFilter);

  const filteredElectricityPayments = branchFilter === 'all'
    ? electricityPayments
    : electricityPayments.filter((p) => (p.kostLocation || 'acarya_1') === branchFilter);

  const branchTenants = branchFilter === 'all'
    ? tenants
    : tenants.filter((t) => (t.kostLocation || 'acarya_1') === branchFilter);

  const totalRoomsCount = branchTenants.length;
  const occupiedCount = branchTenants.filter((t) => t.isOccupied === true || t.status === 'DIHUNI').length;
  const availableCount = totalRoomsCount - occupiedCount;

  const filteredTenants = branchTenants
    .filter((t) => {
      if (statusFilter === 'dihuni') return t.isOccupied === true || t.status === 'DIHUNI';
      if (statusFilter === 'tersedia') return !t.isOccupied || t.status === 'TERSEDIA';
      return true;
    })
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.roomNumber.toLowerCase().includes(q) ||
        (t.origin && t.origin.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q)) ||
        (t.parentPhone && t.parentPhone.includes(q))
      );
    });

  const pendingKost = filteredKostPayments.filter((p) => p.status === 'pending');
  const pendingElectricity = filteredElectricityPayments.filter((p) => p.status === 'pending');
  const totalPending = pendingKost.length + pendingElectricity.length;

  const totalRevenueKost = filteredKostPayments
    .filter((p) => p.status === 'verified')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalRevenueElectricity = filteredElectricityPayments
    .filter((p) => p.status === 'verified')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Per branch stats for summary
  const kost1Revenue = kostPayments
    .filter((p) => p.status === 'verified' && (p.kostLocation || 'acarya_1') === 'acarya_1')
    .reduce((acc, curr) => acc + curr.totalAmount, 0) +
    electricityPayments
      .filter((p) => p.status === 'verified' && (p.kostLocation || 'acarya_1') === 'acarya_1')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const kost2Revenue = kostPayments
    .filter((p) => p.status === 'verified' && p.kostLocation === 'acarya_2')
    .reduce((acc, curr) => acc + curr.totalAmount, 0) +
    electricityPayments
      .filter((p) => p.status === 'verified' && p.kostLocation === 'acarya_2')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);

  // Export CSV with Lokasi Kost column
  const handleExportCSV = () => {
    const headers = 'ID,Lokasi Kost,Jenis,Nama,Kamar,WhatsApp,Nominal,Metode,Status,Tanggal\n';
    const kostRows = filteredKostPayments.map(
      (k) =>
        `"${k.id}","${k.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}","Sewa Kost","${k.tenantName}","${k.roomNumber}","${k.phone}",${k.totalAmount},"${k.paymentMethod}","${k.status}","${k.createdAt}"`
    );
    const elecRows = filteredElectricityPayments.map(
      (e) =>
        `"${e.id}","${e.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}","Listrik kWh","${e.tenantName}","${e.roomNumber}","${e.phone}",${e.totalAmount},"${e.paymentMethod}","${e.status}","${e.createdAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + headers + [...kostRows, ...elecRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Acarya_Kost_${branchFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCredentials = (t: TenantProfile) => {
    const branchName = t.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';
    const defaultUser = t.username || `kamar${t.roomNumber}`;
    const defaultPass = t.password || `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`;
    const text = `*AKUN LOGIN KOSTPAY - ${branchName.toUpperCase()}*\n\nHalo Kak ${t.name},\nBerikut akses login untuk dasbor tagihan sewa & listrik kamar Anda:\n\n🏢 Cabang: ${branchName}\n🚪 Kamar: ${t.roomNumber}\n👤 Username: ${defaultUser}\n🔑 Password: ${defaultPass}\n\nSilakan simpan data ini dan jangan dibagikan ke orang lain ya. Terima kasih!`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllCredentials = () => {
    const lines = filteredTenants.map((t) => {
      const branch = t.kostLocation === 'acarya_2' ? 'Kost 2' : 'Kost 1';
      const u = t.username || `kamar${t.roomNumber}`;
      const p = t.password || `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`;
      return `[${branch}] Kamar ${t.roomNumber} - ${t.name} | User: ${u} | Pass: ${p} | Tarif: Rp ${t.monthlyRentRate.toLocaleString('id-ID')}`;
    });
    const header = `DAFTAR AKUN & PASSWORD KAMAR ACARYA KOST (${branchFilter === 'all' ? 'Semua Cabang' : branchFilter === 'acarya_1' ? 'Kost 1' : 'Kost 2'})\n${'='.repeat(70)}\n`;
    navigator.clipboard.writeText(header + lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSavePassword = () => {
    if (!editingTenant || !editPasswordInput.trim()) return;
    const updated = {
      ...editingTenant,
      password: editPasswordInput.trim(),
    };
    if (onUpdateTenant) {
      onUpdateTenant(updated);
    }
    setEditingTenant(null);
    setEditPasswordInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-admin"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Panel Pengelola Kost
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kelola pembayaran, verifikasi struk transfer, & status 2 cabang: Acarya Kost 1 & 2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenWhatsAppModal && (
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
              title="Buka Sistem Notifikasi WhatsApp"
            >
              <BellRing className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notifikasi WA</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenGoogleSheetsModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheet</span>
          </button>
        </div>
      </div>

      {/* Missing URL Warning Alert */}
      {(!settings.googleWebAppUrl || !settings.googleWebAppUrl.trim()) && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <strong className="block font-bold text-amber-900 mb-0.5">
              URL Google Apps Script Belum Terhubung!
            </strong>
            <p className="text-amber-800 leading-relaxed">
              Saat ini pembayaran yang Anda verifikasi hanya tersimpan di aplikasi dan <strong>belum dapat masuk ke sheet kamar</strong> karena URL Google Apps Script masih kosong. Silakan buka menu Google Sheet untuk menempelkan URL Web App Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenGoogleSheetsModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            Hubungkan URL
          </button>
        </div>
      )}

      {/* Verification Toast Notification (Success, Warning, Error) */}
      {toastData && (
        <div
          className={`rounded-xl p-3.5 flex items-start gap-3 shadow-xs border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastData.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : toastData.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {toastData.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : toastData.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium">
            <strong
              className={`block font-bold mb-0.5 ${
                toastData.type === 'success'
                  ? 'text-emerald-800'
                  : toastData.type === 'warning'
                  ? 'text-amber-800'
                  : 'text-rose-800'
              }`}
            >
              {toastData.title}
            </strong>
            <span className="leading-relaxed">{toastData.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastData(null)}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Branch Filter Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Filter Lokasi Cabang:</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setBranchFilter('all')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              branchFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Cabang
          </button>
          <button
            type="button"
            onClick={() => setBranchFilter('acarya_1')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              branchFilter === 'acarya_1'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-300"></span>
            <span>Acarya Kost 1</span>
          </button>
          <button
            type="button"
            onClick={() => setBranchFilter('acarya_2')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              branchFilter === 'acarya_2'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
            <span>Acarya Kost 2</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold block">
            Sewa Terverifikasi
          </span>
          <span className="text-lg font-bold text-indigo-700 font-mono">
            {formatRupiah(totalRevenueKost)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {branchFilter === 'all' ? '2 Cabang' : branchFilter === 'acarya_1' ? 'Kost 1' : 'Kost 2'}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold block">
            Listrik Terkumpul
          </span>
          <span className="text-lg font-bold text-sky-700 font-mono">
            {formatRupiah(totalRevenueElectricity)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">kWh + Mesin 30rb</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold block">
            Total Penghuni
          </span>
          <span className="text-2xl font-bold text-slate-800 font-mono">
            {filteredTenants.length}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Kamar aktif</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold block">
            Per Cabang (Total)
          </span>
          <div className="text-[11px] font-mono mt-1 space-y-0.5">
            <div className="text-indigo-700 font-bold">K1: {formatRupiah(kost1Revenue)}</div>
            <div className="text-emerald-700 font-bold">K2: {formatRupiah(kost2Revenue)}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('verifikasi')}
          className={`py-2 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'verifikasi'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Verifikasi ({totalPending})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('penghuni')}
          className={`py-2 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'penghuni'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Kamar ({occupiedCount}/{totalRoomsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('akun')}
          className={`py-2 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'akun'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>Akun & Password</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rekap')}
          className={`py-2 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-slate-600" />
          <span>Rekap Transaksi</span>
        </button>
      </div>

      {/* TAB 1: Antrean Verifikasi */}
      {activeTab === 'verifikasi' && (
        <div className="space-y-4">
          {totalPending === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-base font-bold text-slate-800">
                Semua Pembayaran Sudah Terverifikasi!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada bukti transfer yang menunggu pengecekan untuk filter {branchFilter === 'all' ? 'semua cabang' : branchFilter === 'acarya_1' ? 'Acarya Kost 1' : 'Acarya Kost 2'}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Kost */}
              {pendingKost.map((k) => (
                <div
                  key={k.id}
                  className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                          k.kostLocation === 'acarya_2'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {k.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          Kamar {k.roomNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{k.tenantName}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {k.paymentMethod === 'bri' ? 'Transfer BRI' : 'Cash'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Sewa Kost: {k.periodStart} s/d {k.periodEnd} ({k.durationMonths} Bulan) • ID: {k.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-indigo-700 block">
                        {formatRupiah(k.totalAmount)}
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                        ⏳ Pending (Belum Masuk Sheet)
                      </span>
                    </div>
                  </div>

                  {k.notes && (
                    <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-600 border border-slate-100">
                      Catatan Anak Kost: "{k.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      {k.proofImage ? (
                        <button
                          type="button"
                          onClick={() => setPreviewProof(k.proofImage!)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa Bukti Struk</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {k.paymentMethod === 'cash' ? 'Bayar Tunai Langsung (Cash)' : 'Tanpa Bukti'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isVerifyingId === k.id}
                      onClick={() => handleVerifyWithFeedback('kost', k.id, k.roomNumber, k.tenantName)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Ubah status jadi Sukses dan langsung catat ke sheet kamar"
                    >
                      {isVerifyingId === k.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Menyimpan & Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verifikasi Sukses (Kirim ke Sheet Kamar)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Pending Electricity */}
              {pendingElectricity.map((el) => (
                <div
                  key={el.id}
                  className="bg-white rounded-xl p-4 border border-sky-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                          el.kostLocation === 'acarya_2'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {el.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          Kamar {el.roomNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{el.tenantName}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200">
                          Listrik {el.paymentMethod === 'bri' ? 'BRI' : 'Cash'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Listrik Periode {el.periodMonth} • Pemakaian {el.usageKwh} kWh ({el.initialKwh} ➔ {el.finalKwh}) + Mesin Rp 30.000
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-sky-700 block">
                        {formatRupiah(el.totalAmount)}
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                        ⏳ Pending (Belum Masuk Sheet)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      {el.proofImage ? (
                        <button
                          type="button"
                          onClick={() => setPreviewProof(el.proofImage!)}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Periksa Bukti Listrik</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {el.paymentMethod === 'cash' ? 'Bayar Tunai (Cash)' : 'Tanpa Bukti'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isVerifyingId === el.id}
                      onClick={() => handleVerifyWithFeedback('electricity', el.id, el.roomNumber, el.tenantName)}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      title="Ubah status jadi Sukses dan langsung catat ke sheet kamar"
                    >
                      {isVerifyingId === el.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Menyimpan & Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verifikasi Sukses (Kirim ke Sheet Kamar)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Status Kamar & Data Diri Penghuni (Acarya 1 & 2) */}
      {activeTab === 'penghuni' && (
        <div className="space-y-4">
          {/* Room Occupancy Stat Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">Total Kamar</span>
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800">{totalRoomsCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {branchFilter === 'all' ? 'Acarya 1 & 2' : branchFilter === 'acarya_1' ? 'Acarya 1 (11 Kmr)' : 'Acarya 2 (18 Kmr)'}
              </span>
            </div>
            <div className="bg-red-50/60 p-3.5 rounded-xl border border-red-200 shadow-2xs text-center">
              <span className="text-[11px] font-semibold text-red-700 block uppercase tracking-wider">Dihuni</span>
              <span className="text-xl sm:text-2xl font-extrabold text-red-600">{occupiedCount}</span>
              <span className="text-[10px] text-red-500 block mt-0.5">
                {totalRoomsCount > 0 ? `${Math.round((occupiedCount / totalRoomsCount) * 100)}% Okupansi` : '0%'}
              </span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs text-center">
              <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">Tersedia</span>
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{availableCount}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Siap Huni</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pemantauan Status Kamar & Data Diri Penghuni
                </h3>
                <p className="text-xs text-slate-500">
                  Data sinkron dengan Dasbor Acarya Kost ({branchFilter === 'all' ? 'Acarya Kost 1 & Kost 2' : branchFilter === 'acarya_1' ? 'Acarya Kost 1' : 'Acarya Kost 2'})
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({totalRoomsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('dihuni')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'dihuni'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-red-700 hover:text-red-900'
                  }`}
                >
                  Dihuni ({occupiedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('tersedia')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'tersedia'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Tersedia ({availableCount})
                </button>
              </div>
            </div>

            {/* Quick Banner: Atur Tarif Kamar dari Google Sheet */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 block">Nominal Tarif Terhubung dengan Google Sheet</span>
                  <span className="text-[11px] text-emerald-700">Tentukan tarif bulanan tiap kamar di tab master <strong>DAFTAR_TARIF_KAMAR</strong> pada Google Spreadsheet.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenGoogleSheetsModal}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Atur / Tarik Tarif Sheet</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor kamar, nama penghuni, asal daerah, no WA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTenants.map((t) => {
                const isDihuni = t.isOccupied === true || t.status === 'DIHUNI';
                const rentMsg = generateRentReminderMessage(t, settings);
                const rentLink = t.phone ? buildWaLink(t.phone, rentMsg) : '#';

                const elecMsg = generateElectricityReminderMessage(t, settings);
                const elecLink = t.phone ? buildWaLink(t.phone, elecMsg) : '#';

                const ortuMsg = `Halo Bapak/Ibu orang tua dari ${t.name} (Penghuni Kamar ${t.roomNumber} ${t.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}). Kami dari pihak Pengelola Acarya Kost ingin menyampaikan update terkait informasi sewa dan fasilitas kamar. Terima kasih.`;
                const ortuLink = t.parentPhone && t.parentPhone !== '-' ? buildWaLink(t.parentPhone, ortuMsg) : null;

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDihuni
                        ? 'border-slate-200 bg-white shadow-2xs hover:shadow-sm'
                        : 'border-dashed border-slate-300 bg-slate-50/60'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          t.kostLocation === 'acarya_2'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {t.kostLocation === 'acarya_2' ? 'Acarya 2' : 'Acarya 1'}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">
                          Kamar {t.roomNumber}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${
                          isDihuni
                            ? 'text-red-600 border-red-200 bg-red-50'
                            : 'text-emerald-700 border-emerald-200 bg-emerald-50'
                        }`}
                      >
                        {isDihuni ? 'DIHUNI' : 'TERSEDIA'}
                      </span>
                    </div>

                    {/* Content */}
                    {isDihuni ? (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">Nama:</span>
                          <span className="col-span-2 font-bold text-slate-900">{t.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">No. WA:</span>
                          <span className="col-span-2">
                            {t.phone ? (
                              <a
                                href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                              >
                                {t.phone.startsWith('62') ? `+${t.phone}` : t.phone}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">WA Ortu:</span>
                          <span className="col-span-2">
                            {t.parentPhone && t.parentPhone !== '-' ? (
                              <a
                                href={`https://wa.me/${t.parentPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                              >
                                {t.parentPhone.startsWith('62') ? `+${t.parentPhone}` : t.parentPhone}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">Asal:</span>
                          <span className="col-span-2 text-slate-700 font-medium">{t.origin || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">Masuk:</span>
                          <span className="col-span-2 text-slate-700">{t.checkInDate || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">Keluar:</span>
                          <span className="col-span-2 text-slate-500">{t.checkOutDate || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-slate-400 font-medium">Tarif Sewa:</span>
                          <span className="col-span-2 font-bold text-indigo-700 flex items-center gap-1.5">
                            {formatRupiah(t.monthlyRentRate)}/bln
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Sheet
                            </span>
                          </span>
                        </div>

                        {/* Status Sewa & Listrik */}
                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            Sewa:{' '}
                            <strong className={t.activeRentStatus === 'lunas' ? 'text-emerald-600' : 'text-amber-600'}>
                              {t.activeRentStatus.toUpperCase()}
                            </strong>
                          </span>
                          <span className="text-slate-500">
                            Listrik:{' '}
                            <strong className={t.activeElectricityStatus === 'lunas' ? 'text-emerald-600' : 'text-sky-600'}>
                              {t.activeElectricityStatus.toUpperCase()}
                            </strong>
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                          {t.phone && (
                            <>
                              <a
                                href={rentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                title="Kirim Pengingat Sewa Kost"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WA Sewa</span>
                              </a>
                              <a
                                href={elecLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                title="Kirim Pengingat Listrik kWh"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WA Listrik</span>
                              </a>
                            </>
                          )}
                          {ortuLink && (
                            <a
                              href={ortuLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Hubungi Orang Tua Penghuni via WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              <span>WA Ortu</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400 space-y-1.5">
                        <p className="text-xs font-semibold text-slate-600">
                          Kamar ini masih tersedia.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Belum ada data penghuni yang dimasukkan.
                        </p>
                        <p className="text-[11px] font-bold text-indigo-600 pt-1">
                          Tarif Sewa: {formatRupiah(t.monthlyRentRate)}/bulan
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredTenants.length === 0 && (
              <div className="py-8 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada kamar yang cocok dengan kriteria pencarian.</p>
                <p className="text-[11px] text-slate-400">Coba ubah kata kunci atau filter cabang/status.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Akun & Password Kamar */}
      {activeTab === 'akun' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Akun & Password Login Kamar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berikan username & password ini ke masing-masing penghuni agar data tarif sewa & listrik tetap privat
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyAllCredentials}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                title="Salin seluruh username & password kamar ke clipboard"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Semua Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Semua Akun (Master List)</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Tips */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privasi Tarif Kamar:</span>
                <p className="mt-0.5 text-indigo-900/90 leading-relaxed">
                  Dengan sistem login per kamar ini, penghuni hanya dapat melihat dasbor kamar mereka sendiri dan tidak dapat mengintip tarif sewa atau pemakaian listrik kamar lain.
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nomor kamar, nama penghuni, atau username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Accounts Cards Grid */}
            <div className="space-y-3">
              {filteredTenants.map((t) => {
                const defaultUser = t.username || `kamar${t.roomNumber}`;
                const defaultPass =
                  t.password ||
                  `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`;
                const isCopied = copiedId === t.id;

                const branchName = t.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';
                const waInviteMsg = `*AKUN LOGIN KOSTPAY - ${branchName.toUpperCase()}*\n\nHalo Kak ${t.name},\nBerikut akses login untuk dasbor tagihan sewa & listrik kamar Anda:\n\n🏢 Cabang: ${branchName}\n🚪 Kamar: ${t.roomNumber}\n👤 Username: ${defaultUser}\n🔑 Password: ${defaultPass}\n\nSilakan gunakan data di atas untuk masuk ke dasbor Anda secara privat. Terima kasih!`;
                const directWaLink = t.phone ? buildWaLink(t.phone, waInviteMsg) : null;

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 shadow-2xs transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            t.kostLocation === 'acarya_2'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {t.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">
                          Kamar {t.roomNumber}
                        </span>
                        <span className="font-semibold text-slate-700 text-xs">
                          • {t.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border ${
                            t.isOccupied
                              ? 'text-red-600 border-red-200 bg-red-50'
                              : 'text-emerald-700 border-emerald-200 bg-emerald-50'
                          }`}
                        >
                          {t.isOccupied ? 'DIHUNI' : 'TERSEDIA'}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Tarif Sewa Kamar:</span>
                        <span className="text-xs font-bold text-indigo-700 font-mono">
                          {formatRupiah(t.monthlyRentRate)}/bulan
                        </span>
                      </div>
                    </div>

                    {/* Credentials Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-200">
                        <span className="text-slate-500 font-medium">Username:</span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm">
                          {defaultUser}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-200">
                        <span className="text-slate-500 font-medium">Password:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
                            {defaultPass}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTenant(t);
                              setEditPasswordInput(defaultPass);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-sm hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Ubah Password Kamar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="text-[11px] text-slate-400">
                        {t.phone ? (
                          <span>WA: +{t.phone.replace(/[^0-9]/g, '')}</span>
                        ) : (
                          <span className="italic">Belum ada No. WA</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {directWaLink && (
                          <a
                            href={directWaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            title="Kirim kredensial langsung ke WhatsApp penghuni"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Kirim ke WA</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(t)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                          title="Salin teks pesan login siap kirim ke WhatsApp"
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PASSWORD MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  Ubah Password Kamar {editingTenant.roomNumber}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Penghuni: <strong className="text-slate-800">{editingTenant.name}</strong> ({editingTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'})
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Password Baru
              </label>
              <input
                type="text"
                value={editPasswordInput}
                onChange={(e) => setEditPasswordInput(e.target.value)}
                placeholder="Masukkan password baru"
                className="w-full text-xs font-mono font-medium px-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                autoFocus
              />
              <p className="text-[10px] text-slate-400">
                Password ini akan digunakan penghuni untuk login ke dasbor kamar {editingTenant.roomNumber}.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePassword}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                Simpan Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Rekap & Ekspor */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rekap Semua Transaksi ({branchFilter === 'all' ? 'Acarya Kost 1 & 2' : branchFilter === 'acarya_1' ? 'Acarya Kost 1' : 'Acarya Kost 2'})
                </h3>
                <p className="text-xs text-slate-500">
                  Data pembayaran yang tercatat di KostPay dan disinkronkan ke Google Sheet
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh CSV / Excel</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between font-semibold text-slate-500">
                <span>TOTAL TRANSAKSI SEWA (TERVERIFIKASI):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatRupiah(totalRevenueKost)}
                </span>
              </div>
              <div className="py-2.5 flex justify-between font-semibold text-slate-500">
                <span>TOTAL TRANSAKSI LISTRIK (TERVERIFIKASI):</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatRupiah(totalRevenueElectricity)}
                </span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-slate-900 text-sm">
                <span>TOTAL KESELURUHAN PENDAPATAN:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  {formatRupiah(totalRevenueKost + totalRevenueElectricity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {previewProof && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-4 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Foto Bukti Transfer</h4>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-96 overflow-auto bg-slate-100 rounded-lg p-2 flex items-center justify-center">
              <img
                src={previewProof}
                alt="Bukti Transfer"
                className="max-h-80 object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
