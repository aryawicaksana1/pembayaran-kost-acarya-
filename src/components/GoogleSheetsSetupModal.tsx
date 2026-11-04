import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ArrowLeft,
  Copy,
  CheckCircle2,
  Play,
  HelpCircle,
  Sparkles,
  Link2,
  Layers,
  FolderSync,
  Split,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Search,
  Check,
  Edit2,
  Table,
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  sendToGoogleSheets,
  fetchRoomRatesFromGoogleSheets,
  PERMANENT_GOOGLE_WEBAPP_URL,
} from '../utils/googleSheetsSync';
import { AppSettings, TenantProfile, KostPaymentRecord, ElectricityRecord } from '../types';
import { formatRupiah } from '../utils/whatsappHelper';

interface GoogleSheetsSetupModalProps {
  settings: AppSettings;
  tenants?: TenantProfile[];
  kostPayments?: KostPaymentRecord[];
  electricityPayments?: ElectricityRecord[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateTenants?: (updatedTenants: TenantProfile[]) => void;
  onClose: () => void;
}

export const GoogleSheetsSetupModal: React.FC<GoogleSheetsSetupModalProps> = ({
  settings,
  tenants = [],
  kostPayments = [],
  electricityPayments = [],
  onUpdateSettings,
  onUpdateTenants,
  onClose,
}) => {
  const [webAppUrl, setWebAppUrl] = useState(
    settings.googleWebAppUrl || PERMANENT_GOOGLE_WEBAPP_URL
  );
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [testStatus, setTestStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  const [initSheetsStatus, setInitSheetsStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  const [splitDataStatus, setSplitDataStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  const [syncRatesStatus, setSyncRatesStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  const [rateBranchFilter, setRateBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [rateSearchQuery, setRateSearchQuery] = useState('');
  const [editingRateTenantId, setEditingRateTenantId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<string>('');
  const [urlSavedNotice, setUrlSavedNotice] = useState<string | null>(null);

  const handleSyncRatesFromSheets = async () => {
    if (!webAppUrl.trim()) {
      setSyncRatesStatus({
        running: false,
        success: false,
        message: 'Silakan tempel & simpan URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    setSyncRatesStatus({ running: true });

    try {
      const res = await fetchRoomRatesFromGoogleSheets(webAppUrl.trim());

      if (res.success && res.rates && res.rates.length > 0) {
        let updatedCount = 0;
        const newTenants = tenants.map((t) => {
          const match = res.rates!.find(
            (r) =>
              (r.kostLocation || 'acarya_1') === (t.kostLocation || 'acarya_1') &&
              r.roomNumber.replace(/\D/g, '').padStart(2, '0') ===
                t.roomNumber.replace(/\D/g, '').padStart(2, '0')
          );
          if (match && match.monthlyRentRate > 0) {
            updatedCount++;
            return {
              ...t,
              monthlyRentRate: match.monthlyRentRate,
              name: match.tenantName && match.tenantName.indexOf('Tersedia') === -1 && match.tenantName.length > 2 ? match.tenantName : t.name,
              rentDueDateDay: match.rentDueDateDay || t.rentDueDateDay,
            };
          }
          return t;
        });

        if (onUpdateTenants) {
          onUpdateTenants(newTenants);
        }

        onUpdateSettings({
          lastRatesSyncedAt: new Date().toLocaleString('id-ID'),
        });

        setSyncRatesStatus({
          running: false,
          success: true,
          message: `Sukses! Berhasil menyinkronkan tarif ${updatedCount} kamar dari Google Sheet. Nominal pembayaran sewa masing-masing kamar kini otomatis mengikuti yang Anda tentukan di Google Sheet.`,
        });
      } else {
        // Otomatis buat / inisialisasi sheet DAFTAR_TARIF_KAMAR jika belum ada
        await sendToGoogleSheets(webAppUrl.trim(), {
          action: 'init_rate_sheet',
          timestamp: new Date().toISOString(),
        });

        setSyncRatesStatus({
          running: false,
          success: false,
          message:
            (res.message || 'Belum ada data tarif.') +
            ' Tab "DAFTAR_TARIF_KAMAR" telah otomatis disiapkan di Google Sheet Anda. Silakan isi angka tarif di kolom D (Tarif Sewa Bulanan) pada tab tersebut, lalu klik tombol ini lagi.',
        });
      }
    } catch (err: any) {
      setSyncRatesStatus({
        running: false,
        success: false,
        message: err?.message || 'Gagal memuat tarif kamar dari Google Sheet.',
      });
    }
  };

  const handleInitRateSheet = async () => {
    if (!webAppUrl.trim()) {
      setSyncRatesStatus({
        running: false,
        success: false,
        message: 'Silakan tempel & simpan URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    setSyncRatesStatus({ running: true });

    try {
      const res = await sendToGoogleSheets(webAppUrl.trim(), {
        action: 'init_rate_sheet',
        timestamp: new Date().toISOString(),
      });

      setSyncRatesStatus({
        running: false,
        success: res.success,
        message: res.success
          ? 'Berhasil membuat tab master "DAFTAR_TARIF_KAMAR" di Google Spreadsheet Anda! Anda dapat membuka tab tersebut di Google Sheet, mengubah nominal tarif masing-masing kamar di Kolom D, lalu menekan tombol "Tarik Tarif dari Google Sheet".'
          : res.message,
      });
    } catch (err: any) {
      setSyncRatesStatus({
        running: false,
        success: false,
        message: err?.message || 'Gagal menyiapkan tab tarif di Google Spreadsheet.',
      });
    }
  };

  const handleSaveInlineRate = (tenantId: string) => {
    const num = parseInt(editRateValue.replace(/\D/g, ''), 10);
    if (!num || num <= 0) {
      setEditingRateTenantId(null);
      return;
    }

    const newTenants = tenants.map((t) => (t.id === tenantId ? { ...t, monthlyRentRate: num } : t));
    if (onUpdateTenants) {
      onUpdateTenants(newTenants);
    }
    setEditingRateTenantId(null);
    setEditRateValue('');
  };

  const filteredRateTenants = tenants
    .filter((t) => {
      if (rateBranchFilter === 'all') return true;
      return (t.kostLocation || 'acarya_1') === rateBranchFilter;
    })
    .filter((t) => {
      if (!rateSearchQuery) return true;
      const q = rateSearchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.roomNumber.includes(q) ||
        (t.kostLocation && t.kostLocation.toLowerCase().includes(q))
      );
    });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ googleWebAppUrl: webAppUrl.trim() });
    setUrlSavedNotice('URL Google Apps Script berhasil disimpan! Webapp kini terhubung dengan Google Sheet Anda.');
    setTimeout(() => setUrlSavedNotice(null), 4000);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setTestStatus({
        running: false,
        success: false,
        message: 'Silakan tempel (paste) URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    setTestStatus({ running: true });

    try {
      const result = await sendToGoogleSheets(webAppUrl.trim(), {
        action: 'test_connection',
        message: 'Tes koneksi real-time dari aplikasi KostPay berhasil!',
        timestamp: new Date().toISOString(),
      });

      setTestStatus({
        running: false,
        success: result.success,
        message: result.message,
      });
    } catch (err: any) {
      setTestStatus({
        running: false,
        success: false,
        message: err?.message || 'Gagal terhubung ke Google Apps Script',
      });
    }
  };

  // 1-Click: Pisahkan & pindahkan semua data lama yang masih jadi 1 ke tab kamar masing-masing
  const handleSplitExistingData = async () => {
    if (!webAppUrl.trim()) {
      setSplitDataStatus({
        running: false,
        success: false,
        message: 'Silakan simpan URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    setSplitDataStatus({ running: true });

    try {
      // 1. Perintahkan Google Apps Script memecah data lama di sheet master
      await sendToGoogleSheets(webAppUrl.trim(), {
        action: 'split_existing_data',
        timestamp: new Date().toISOString(),
      });

      // 2. Sinkronkan riwayat transaksi yang SUDAH DIVERIFIKASI (Sukses) ke tab kamar masing-masing
      const syncResult = await sendToGoogleSheets(webAppUrl.trim(), {
        action: 'sync_all_transactions',
        kostPayments: kostPayments
          .filter((k) => k.status === 'verified')
          .map((k) => ({
            ...k,
            proofImage: undefined, // hemat payload bandwidth
          })),
        electricityPayments: electricityPayments
          .filter((e) => e.status === 'verified')
          .map((e) => ({
            ...e,
            proofImage: undefined,
            meterPhoto: undefined,
          })),
        timestamp: new Date().toISOString(),
      });

      setSplitDataStatus({
        running: false,
        success: syncResult.success,
        message: syncResult.success
          ? 'Berhasil! Seluruh transaksi terverifikasi (Sukses) telah otomatis dipisahkan dan dimasukkan ke dalam tab sheet kamar masing-masing. Pembayaran berstatus Pending tetap aman dan tidak akan masuk ke sheet kamar sampai Anda memverifikasinya.'
          : syncResult.message,
      });
    } catch (err: any) {
      setSplitDataStatus({
        running: false,
        success: false,
        message: err?.message || 'Gagal menjalankan pemisahan data di Google Spreadsheet.',
      });
    }
  };

  // 1-Click: Buat semua 29 tab kamar
  const handleInitAllRoomSheets = async () => {
    if (!webAppUrl.trim()) {
      setInitSheetsStatus({
        running: false,
        success: false,
        message: 'Silakan simpan URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    setInitSheetsStatus({ running: true });

    try {
      const tenantPayload = tenants.map((t) => ({
        name: t.name,
        roomNumber: t.roomNumber,
        kostLocation: t.kostLocation,
      }));

      const result = await sendToGoogleSheets(webAppUrl.trim(), {
        action: 'init_room_sheets',
        tenants: tenantPayload,
        timestamp: new Date().toISOString(),
      });

      setInitSheetsStatus({
        running: false,
        success: result.success,
        message:
          result.success
            ? `Berhasil! Seluruh 29 tab sheet kamar (Acarya 1 & Acarya 2) telah dibuat & disinkronkan di Google Spreadsheet Anda dengan format penamaan nama penghuni_kamar_acarya 1/2!`
            : result.message,
      });
    } catch (err: any) {
      setInitSheetsStatus({
        running: false,
        success: false,
        message: err?.message || 'Gagal membuat tab sheet kamar di Google Spreadsheet',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-sheets"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Integrasi Google Sheets Multi-Kamar
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Apps Script V2
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Setiap kamar memiliki sheet terpisah: <strong className="text-slate-700 font-mono">nama penghuni_kamar_acarya 1/2</strong>
          </p>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-xl p-5 shadow-sm space-y-2 border border-emerald-700/30">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Sistem Buku Kas Terpisah Tiap Kamar</span>
        </div>
        <h3 className="text-base sm:text-lg font-bold">
          Sheet Terpisah Per Kamar + Link Foto Bukti Google Drive
        </h3>
        <p className="text-xs text-emerald-50 leading-relaxed">
          Data transaksi kini <strong>wajib dan otomatis masuk ke tab sheet kamar masing-masing</strong> dengan format: <code className="bg-emerald-950/70 px-1.5 py-0.5 rounded font-mono text-emerald-200">Nama Penghuni_Kamar [Nomor]_Acarya 1 atau 2</code> (contoh: <span className="underline decoration-emerald-400 font-bold">I GUSTI PUTU ARYA WICAKSANA_Kamar 02_Acarya 2</span>).
        </p>
      </div>

      {/* Warning & Solution Box: Solusi Data Masih Menumpuk & Penanganan Stuck Code 36 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4.5 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Perbaikan Data & Solusi Jika Terjadi "Stuck Panggilan di Code 36":
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Kode terbaru versi 2.5 ini telah dioptimalkan dengan <em>Sheet In-Memory Caching</em> dan proteksi <em>try-catch</em> sehingga tidak akan lagi mengalami waktu tunggu habis (timeout/stuck) saat membuat tab kamar:
            </p>
            <ol className="list-decimal pl-4 text-xs text-amber-900 space-y-1 mt-1 font-medium">
              <li>
                <strong>Salin kode baru di Langkah 2</strong> di bawah, lalu perbarui di Google Apps Script Anda (hapus semua kode lama, tempel kode baru, lalu klik Simpan).
              </li>
              <li>
                <strong>Perbarui Deployment</strong>: Klik <em>Deploy</em> ➔ <em>Manage deployments</em> ➔ klik ikon Pensil ➔ pilih <strong>New version</strong> ➔ klik <em>Deploy</em>.
              </li>
              <li>
                <strong>Klik tombol "Pisahkan Data Lama"</strong> di bawah untuk memindahkan transaksi yang masih jadi satu ke tab masing-masing kamar tanpa ada proses yang stuck.
              </li>
              <li>
                <strong>Alur Verifikasi Real-time</strong>: Pembayaran yang dikirim oleh penghuni berstatus <em>Pending</em> dan <strong>TIDAK LANGSUNG masuk ke sheet kamar</strong>. Data baru akan otomatis dicatat ke sheet kamar setelah Anda (Admin) memverifikasi pembayaran di Panel Admin, dan statusnya otomatis digantikan menjadi <strong>Sukses</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Action Card: Pisahkan Data Lama & Buat 29 Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Button 1: Pisahkan Data */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Split className="w-4 h-4 text-emerald-600" />
              <span>Pisahkan Semua Data Lama</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Memecah semua data yang terkumpul di 1 sheet ke tab kamar masing-masing penghuni.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSplitExistingData}
            disabled={splitDataStatus.running}
            className="w-full px-3.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${splitDataStatus.running ? 'animate-spin' : ''}`} />
            <span>{splitDataStatus.running ? 'Memisahkan Data...' : 'Pisahkan Data Sekarang'}</span>
          </button>
        </div>

        {/* Button 2: Buat 29 Tab */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Buat 29 Tab Kamar Lengkap</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Membuat langsung 11 tab Acarya 1 & 18 tab Acarya 2 dengan format nama lengkap.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInitAllRoomSheets}
            disabled={initSheetsStatus.running}
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <FolderSync className={`w-3.5 h-3.5 text-emerald-400 ${initSheetsStatus.running ? 'animate-spin' : ''}`} />
            <span>{initSheetsStatus.running ? 'Membuat Tab...' : 'Buat 29 Tab Kamar'}</span>
          </button>
        </div>
      </div>

      {splitDataStatus.message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
            splitDataStatus.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{splitDataStatus.message}</span>
        </div>
      )}

      {initSheetsStatus.message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
            initSheetsStatus.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{initSheetsStatus.message}</span>
        </div>
      )}

      {/* SECTION: SINKRONISASI TARIF KAMAR DARI GOOGLE SHEET */}
      <div className="bg-white rounded-xl p-5 border border-emerald-300 shadow-sm space-y-4 ring-1 ring-emerald-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span>Atur Nominal Pembayaran Kamar dari Google Sheet</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Tab DAFTAR_TARIF_KAMAR
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Input nominal sewa per kamar di Google Sheet ➔ Webapp otomatis mengikuti tarif tersebut
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {settings.lastRatesSyncedAt && (
              <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                Terakhir sinkron: {settings.lastRatesSyncedAt}
              </span>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cara Menentukan Nominal Kamar di Google Sheet:</span>
          </p>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Buka Google Sheet Anda pada tab <strong>DAFTAR_TARIF_KAMAR</strong>. Anda cukup mengubah angka pada kolom <strong>Tarif Sewa Bulanan (Rp)</strong> untuk setiap kamar yang diinginkan. Setelah itu, tekan tombol hijau di bawah untuk menarik tarif terbaru ke webapp ini.
          </p>
        </div>

        {/* Action Buttons for Rates */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleSyncRatesFromSheets}
            disabled={syncRatesStatus.running}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${syncRatesStatus.running ? 'animate-spin' : ''}`} />
            <span>{syncRatesStatus.running ? 'Menyinkronkan Tarif...' : 'Tarik Tarif dari Google Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handleInitRateSheet}
            disabled={syncRatesStatus.running}
            className="px-3.5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Buat tab DAFTAR_TARIF_KAMAR di Google Sheet"
          >
            <Table className="w-3.5 h-3.5 text-emerald-600" />
            <span>Buat / Reset Tab DAFTAR_TARIF_KAMAR</span>
          </button>
        </div>

        {syncRatesStatus.message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
              syncRatesStatus.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {syncRatesStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{syncRatesStatus.message}</span>
          </div>
        )}

        {/* Table of Room Rates */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>Daftar Nominal Tarif Sewa Kamar Saat Ini ({tenants.length} Kamar)</span>
            </span>

            <div className="flex items-center gap-2">
              {/* Branch filter */}
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setRateBranchFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    rateBranchFilter === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setRateBranchFilter('acarya_1')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    rateBranchFilter === 'acarya_1' ? 'bg-white shadow-2xs text-indigo-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  Acarya 1
                </button>
                <button
                  type="button"
                  onClick={() => setRateBranchFilter('acarya_2')}
                  className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    rateBranchFilter === 'acarya_2' ? 'bg-white shadow-2xs text-emerald-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  Acarya 2
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={rateSearchQuery}
                  onChange={(e) => setRateSearchQuery(e.target.value)}
                  placeholder="Cari kamar..."
                  className="w-28 sm:w-36 text-[11px] pl-6 pr-2 py-1 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-emerald-500"
                />
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>
          </div>

          {/* Room Rates List */}
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
            {filteredRateTenants.map((t) => {
              const isEditing = editingRateTenantId === t.id;

              return (
                <div
                  key={t.id}
                  className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        t.kostLocation === 'acarya_2'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {t.kostLocation === 'acarya_2' ? 'Kost 2' : 'Kost 1'}
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">Kamar {t.roomNumber}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editRateValue}
                          onChange={(e) => setEditRateValue(e.target.value)}
                          className="w-28 p-1 text-xs font-mono font-bold border border-emerald-400 rounded bg-white text-right"
                          placeholder="Nominal"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineRate(t.id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                          title="Simpan"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                          {formatRupiah(t.monthlyRentRate)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRateTenantId(t.id);
                            setEditRateValue(String(t.monthlyRentRate));
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                          title="Edit Cepat Tarif"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 1: Input URL Web App & Test */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
              1
            </div>
            <span>URL Google Apps Script Web App Utama:</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Tersimpan Permanen
          </span>
        </div>

        <form onSubmit={handleSaveUrl} className="space-y-3">
          <div className="relative">
            <input
              id="input-webapp-url"
              type="url"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-emerald-500 pr-10"
            />
            <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              Simpan Perubahan URL
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus.running}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer border border-slate-200"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>{testStatus.running ? 'Menguji...' : 'Uji Koneksi Google Sheet'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWebAppUrl(PERMANENT_GOOGLE_WEBAPP_URL);
                onUpdateSettings({ googleWebAppUrl: PERMANENT_GOOGLE_WEBAPP_URL });
                setUrlSavedNotice('URL telah di-reset ke URL Resmi Permanen!');
                setTimeout(() => setUrlSavedNotice(null), 3500);
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              title="Kembalikan ke URL Google Apps Script Permanen"
            >
              Reset ke URL Permanen
            </button>
          </div>
        </form>

        {urlSavedNotice && (
          <div className="p-3 rounded-lg text-xs flex items-center gap-2 border bg-emerald-50 text-emerald-800 border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{urlSavedNotice}</span>
          </div>
        )}

        {testStatus.message && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              testStatus.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {testStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{testStatus.message}</span>
          </div>
        )}
      </div>

      {/* Step 2: Code Apps Script with 1-Click Copy */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
              2
            </div>
            <span>Salin Kode Google Apps Script (Code.gs)</span>
          </div>

          <button
            id="btn-copy-apps-script"
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Tersalin Semua!' : 'Salin Seluruh Kode'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Kode ini sudah dilengkapi fungsi <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold">pisahkanSemuaDataKeSheetKamar</code> untuk otomatis memindahkan semua data lama ke tab kamar masing-masing.
        </p>

        {/* Code Box */}
        <div className="relative rounded-lg bg-slate-900 text-emerald-400 p-4 font-mono text-[11px] leading-relaxed max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
          <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>

      {/* Step 3: Cara Pasang di Google Spreadsheet */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
          <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
            3
          </div>
          <span>Panduan Memperbarui & Memisahkan Data di Google Spreadsheet:</span>
        </div>

        <ol className="list-decimal pl-5 space-y-3 text-xs text-slate-700 leading-relaxed">
          <li>
            Buka Spreadsheet Anda, lalu klik menu <strong>Ekstensi</strong> (Extensions) ➔ <strong>Apps Script</strong>.
          </li>
          <li>
            Hapus seluruh kode lama di layar Apps Script, lalu <strong>Tempel (Paste)</strong> kode baru yang Anda salin dari Langkah 2 di atas, kemudian klik <strong>Simpan</strong> (ikon disket).
          </li>
          <li className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-950 font-medium">
            <strong>Cara Memisahkan Data Lama Langsung dari Apps Script:</strong>
            <p className="mt-1 text-[11px] text-slate-600 font-normal">
              Di toolbar Apps Script (sebelah kanan tombol 'Debug'), klik dropdown pilihan fungsi ➔ pilih fungsi <strong className="text-emerald-800 font-mono">pisahkanSemuaDataKeSheetKamar</strong> ➔ klik tombol <strong>Jalankan (Run)</strong>. Seluruh data lama yang berkumpul di sheet master akan langsung dipindah ke tab kamar masing-masing!
            </p>
          </li>
          <li className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-900">
            <strong>Cara Update Deployment (Agar Pengiriman Baru Masuk ke Tab Kamar):</strong>
            <p className="mt-1 text-[11px] text-slate-600">
              Di pojok kanan atas Apps Script, klik tombol biru <strong>Terapkan (Deploy)</strong> ➔ <strong>Kelola penerapan (Manage deployments)</strong> ➔ klik ikon <strong>Pensil (Edit)</strong> di kanan atas ➔ pada <em>Versi (Version)</em> pilih <strong>Versi baru (New version)</strong> ➔ klik <strong>Terapkan (Deploy)</strong>.
            </p>
          </li>
          <li>
            Selesai! Kini setiap kali pembayaran dimasukkan, data akan otomatis terpisah rapi ke tab kamar masing-masing dengan penamaan <span className="font-semibold text-slate-900">Nama Penghuni_Kamar [Nomor]_Acarya 1 / 2</span>.
          </li>
        </ol>
      </div>
    </div>
  );
};
