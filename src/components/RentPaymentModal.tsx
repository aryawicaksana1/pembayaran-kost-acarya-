import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  ArrowLeft,
  Building,
  Banknote,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TenantProfile, AppSettings, PaymentMethod, KostPaymentType, KostPaymentRecord } from '../types';
import { formatRupiah, buildWaLink, generateTenantSubmissionNotification, generateRentReminderMessage } from '../utils/whatsappHelper';
import { sendToGoogleSheets } from '../utils/googleSheetsSync';
import { compressImageFile } from '../utils/imageCompressor';

interface RentPaymentModalProps {
  currentTenant: TenantProfile;
  settings: AppSettings;
  onClose: () => void;
  onSubmitPayment: (record: KostPaymentRecord) => void;
}

export const RentPaymentModal: React.FC<RentPaymentModalProps> = ({
  currentTenant,
  settings,
  onClose,
  onSubmitPayment,
}) => {
  const [paymentType, setPaymentType] = useState<KostPaymentType>('bulanan');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [monthlyRate, setMonthlyRate] = useState<number>(currentTenant.monthlyRentRate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bri');
  const [proofImage, setProofImage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedBank, setCopiedBank] = useState<boolean>(false);
  const [successRecord, setSuccessRecord] = useState<KostPaymentRecord | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync monthly rate whenever currentTenant or its synced rate changes
  useEffect(() => {
    if (currentTenant.monthlyRentRate) {
      setMonthlyRate(currentTenant.monthlyRentRate);
    }
  }, [currentTenant.monthlyRentRate]);

  // Month calculation
  const monthsToPay =
    paymentType === 'bulanan' ? 1 : paymentType === 'tahunan' ? 12 : Math.max(1, durationMonths);
  const totalAmount = monthlyRate * monthsToPay;

  // Period string calculation
  const now = new Date();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const startMonthIdx = now.getMonth();
  const startYear = now.getFullYear();
  const endMonthTotal = startMonthIdx + monthsToPay - 1;
  const endMonthIdx = endMonthTotal % 12;
  const endYear = startYear + Math.floor(endMonthTotal / 12);

  const periodStart = `${monthNames[startMonthIdx]} ${startYear}`;
  const periodEnd = `${monthNames[endMonthIdx]} ${endYear}`;

  // Due Date (e.g. 5th of current month)
  const dueDateStr = `${startYear}-${String(startMonthIdx + 1).padStart(2, '0')}-${String(currentTenant.rentDueDateDay).padStart(2, '0')}`;

  const [isCompressing, setIsCompressing] = useState(false);

  const handleCopyBank = () => {
    navigator.clipboard.writeText(settings.briAccountNo.replace(/\D/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValidationError(null);
      try {
        setIsCompressing(true);
        const compressed = await compressImageFile(file, 1200, 0.75);
        setProofImage(compressed);
      } catch (err) {
        console.warn('Fallback to standard reader:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setProofImage(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation
    if (paymentMethod === 'bri' && !proofImage) {
      setValidationError('Untuk metode pembayaran Transfer Bank BRI, Anda wajib melampirkan foto / screenshot bukti transfer.');
      return;
    }

    setIsSubmitting(true);

    const newRecord: KostPaymentRecord = {
      id: `KP-${Date.now().toString().slice(-6)}`,
      kostLocation: currentTenant.kostLocation || 'acarya_1',
      tenantName: currentTenant.name,
      roomNumber: currentTenant.roomNumber,
      phone: currentTenant.phone,
      paymentType,
      durationMonths: monthsToPay,
      monthlyRate,
      totalAmount,
      periodStart,
      periodEnd,
      dueDate: dueDateStr,
      paymentMethod,
      proofImage: proofImage || undefined,
      notes: notes.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toLocaleString('id-ID'),
      syncedToSheets: false,
    };

    // Sesuai alur: Pembayaran berstatus 'pending' TIDAK LANGSUNG masuk ke Google Sheet kamar.
    // Data baru akan dikirim dan dicatat ke sheet kamar setelah Admin memverifikasi pembayaran.

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onSubmitPayment(newRecord);
    setSuccessRecord(newRecord);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-rent"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pembayaran Sewa Kost
          </h2>
          <p className="text-xs text-slate-500">
            Formulir pembayaran sewa bulanan, tahunan, atau beberapa bulan
          </p>
        </div>
      </div>

      {successRecord ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Pembayaran Berhasil Dikirim!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Terima kasih, pembayaran sebesar <strong>{formatRupiah(successRecord.totalAmount)}</strong> untuk Kamar {successRecord.roomNumber} telah dicatat.
            </p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-xs text-left space-y-2 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">ID Transaksi:</span>
              <span className="font-mono font-bold text-slate-800">{successRecord.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Periode:</span>
              <span className="font-semibold text-slate-800">{successRecord.periodStart} s/d {successRecord.periodEnd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metode Bayar:</span>
              <span className="font-semibold text-slate-800 uppercase">{successRecord.paymentMethod}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Status Pembayaran:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                ⏳ Pending (Menunggu Verifikasi Admin)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Google Sheet Kamar:</span>
              <span className="font-semibold text-slate-600 text-[11px]">
                Masuk otomatis ke sheet kamar setelah diverifikasi
              </span>
            </div>
          </div>

          {/* Direct WhatsApp notification actions */}
          <div className="pt-2 space-y-2">
            <a
              id="btn-wa-confirm-rent"
              href={buildWaLink(
                settings.adminPhone,
                generateTenantSubmissionNotification(successRecord, false, settings)
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Kirim Konfirmasi WhatsApp ke Pengelola</span>
            </a>

            <button
              id="btn-done-rent"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Identity Summary */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Penghuni Kost
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {currentTenant.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  currentTenant.kostLocation === 'acarya_2'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}>
                  {currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                  Kamar {currentTenant.roomNumber}
                </span>
              </div>
            </div>

            {/* Rent Type Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Durasi Sewa:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bulanan', label: '1 Bulan', desc: 'Bulanan' },
                  { id: 'beberapa_bulan', label: 'Beberapa Bln', desc: 'Custom' },
                  { id: 'tahunan', label: '1 Tahun', desc: '12 Bulan' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setPaymentType(t.id as KostPaymentType);
                      if (t.id === 'bulanan') setDurationMonths(1);
                      if (t.id === 'tahunan') setDurationMonths(12);
                    }}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      paymentType === t.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* If custom months */}
            {paymentType === 'beberapa_bulan' && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Bulan yang Dibayar:
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="11"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(parseInt(e.target.value) || 2)}
                    className="flex-1 accent-indigo-600 cursor-pointer"
                  />
                  <span className="w-16 py-1 text-center bg-white rounded-lg border border-slate-300 font-bold text-indigo-700 text-sm">
                    {durationMonths} Bulan
                  </span>
                </div>
              </div>
            )}

            {/* Period Breakdown */}
            <div className="bg-indigo-50/60 rounded-lg p-3.5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-500">Periode Terhitung:</span>
                <div className="font-bold text-slate-800">
                  {periodStart} {monthsToPay > 1 ? `s/d ${periodEnd}` : ''}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                  <span className="text-slate-500">Tarif per Bulan:</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600" />
                    Google Sheet
                  </span>
                </div>
                <div className="font-bold text-slate-800 mt-0.5">{formatRupiah(monthlyRate)}</div>
              </div>
            </div>

            {/* Total Display */}
            <div className="p-3.5 bg-slate-900 rounded-lg flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pembayaran Sewa</p>
                <p className="text-xs text-slate-300">{monthsToPay} Bulan × {formatRupiah(monthlyRate)}</p>
              </div>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Metode Pembayaran</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('bri')}
                className={`p-3.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === 'bri'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold">Transfer Bank BRI</span>
                <span className="text-[10px] text-slate-500">ATM / BRImo / Internet Banking</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold">Cash (Tunai)</span>
                <span className="text-[10px] text-slate-500">Langsung ke Pengelola</span>
              </button>
            </div>

            {/* Payment Details Container */}
            {paymentMethod === 'bri' && (
              <div className="bg-blue-50/70 rounded-lg p-4 border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    Rekening Transfer Bank BRI:
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-200 text-blue-900">
                    BANK BRI
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200 flex items-center justify-between">
                  <div>
                    <div className="text-base sm:text-lg font-mono font-bold text-blue-950">
                      {settings.briAccountNo}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold uppercase">
                      a.n {settings.briAccountName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedBank ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Harap sertakan berita transfer: <strong>Sewa Kost Kmr {currentTenant.roomNumber} - {currentTenant.name}</strong>
                </p>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 space-y-2 text-xs text-emerald-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-700" />
                  <span>Petunjuk Pembayaran Tunai (Cash):</span>
                </div>
                <p className="text-slate-600">
                  Pembayaran tunai dapat diserahkan langsung kepada <strong>{settings.adminName}</strong> di kantor pengelola kost.
                </p>
                <div className="bg-white/80 p-2.5 rounded-lg text-[11px] text-slate-700 font-medium border border-emerald-200">
                  📌 <em>Catatan: Untuk pembayaran tunai, Anda <strong>TIDAK PERLU</strong> mengunggah bukti pembayaran. Langsung tekan tombol kirim untuk mencatat jadwal bayar.</em>
                </div>
              </div>
            )}
          </div>

          {/* Proof of Payment Upload */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Bukti Pembayaran</span>
              </label>
              {paymentMethod === 'cash' ? (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Tidak Perlu (Cash)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  *Wajib Diunggah
                </span>
              )}
            </div>

            {paymentMethod === 'cash' ? (
              <p className="text-xs text-slate-500">
                Anda memilih pembayaran Cash. Bukti transfer tidak dibutuhkan.
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Unggah tangkapan layar (screenshot) struk m-Banking atau bukti transfer Bank BRI:
                </p>

                {isCompressing ? (
                  <div className="border-2 border-dashed border-indigo-300 rounded-lg p-5 text-center bg-indigo-50/50">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
                    <span className="text-xs font-bold text-indigo-700 block">
                      Mengompres & Menyiapkan Foto Bukti...
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Mengoptimalkan gambar agar cepat diunggah ke Google Drive & Sheets
                    </span>
                  </div>
                ) : proofImage ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2">
                    <img
                      src={proofImage}
                      alt="Bukti Transfer"
                      className="w-full max-h-56 object-contain rounded-md mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setProofImage('')}
                      className="mt-2 text-xs text-red-600 font-bold hover:underline block text-center w-full cursor-pointer"
                    >
                      Hapus / Ganti Foto Bukti
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-lg p-5 text-center cursor-pointer transition-colors block bg-slate-50/50 hover:bg-indigo-50/30">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-indigo-600 block">
                      Klik untuk Pilih Foto Bukti Transfer
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Mendukung format JPG, PNG, atau screenshot
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Tambahan (Opsional):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Contoh: Sudah saya transfer via m-BCA a.n Rian, mohon dicek kak"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-hidden bg-slate-50"
              />
            </div>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{validationError}</div>
            </div>
          )}

          {/* Submit Button */}
          <div className="space-y-2">
            <button
              id="btn-submit-rent"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Mengirim Data...' : `Kirim Pembayaran Sewa (${formatRupiah(totalAmount)})`}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Data otomatis tercatat di sistem & terkirim ke Google Sheets pengelola.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
