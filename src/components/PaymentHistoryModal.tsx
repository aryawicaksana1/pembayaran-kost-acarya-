import React, { useState } from 'react';
import {
  Receipt,
  ArrowLeft,
  Calendar,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  X,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';
import { KostPaymentRecord, ElectricityRecord, TenantProfile, KostLocation } from '../types';
import { formatRupiah } from '../utils/whatsappHelper';

interface PaymentHistoryModalProps {
  currentTenant: TenantProfile;
  kostPayments: KostPaymentRecord[];
  electricityPayments: ElectricityRecord[];
  isAdmin: boolean;
  onClose: () => void;
  onVerifyPayment?: (type: 'kost' | 'electricity', id: string) => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  currentTenant,
  kostPayments,
  electricityPayments,
  isAdmin,
  onClose,
  onVerifyPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'kost' | 'listrik'>('kost');
  const [branchFilter, setBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter by user role and branch
  const baseKost = isAdmin
    ? kostPayments
    : kostPayments.filter((p) => p.roomNumber === currentTenant.roomNumber);

  const baseElectricity = isAdmin
    ? electricityPayments
    : electricityPayments.filter((p) => p.roomNumber === currentTenant.roomNumber);

  const filteredKost =
    branchFilter === 'all'
      ? baseKost
      : baseKost.filter((p) => (p.kostLocation || 'acarya_1') === branchFilter);

  const filteredElectricity =
    branchFilter === 'all'
      ? baseElectricity
      : baseElectricity.filter((p) => (p.kostLocation || 'acarya_1') === branchFilter);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-history"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Semua Riwayat Transaksi Kost' : 'Riwayat Pembayaran Saya'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Daftar semua bukti transfer dan status pembayaran Acarya Kost 1 & 2'
              : `Daftar bukti pembayaran dan verifikasi untuk Kamar ${currentTenant.roomNumber} (${currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'})`}
          </p>
        </div>
      </div>

      {/* Branch Filter (Especially useful for Admin) */}
      {isAdmin && (
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Filter Cabang:</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setBranchFilter('all')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                branchFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setBranchFilter('acarya_1')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                branchFilter === 'acarya_1'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acarya Kost 1
            </button>
            <button
              type="button"
              onClick={() => setBranchFilter('acarya_2')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                branchFilter === 'acarya_2'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Acarya Kost 2
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('kost')}
          className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'kost'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Sewa Kost ({filteredKost.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('listrik')}
          className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'listrik'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Listrik kWh ({filteredElectricity.length})</span>
        </button>
      </div>

      {/* List Content */}
      <div className="space-y-3">
        {activeTab === 'kost' ? (
          filteredKost.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200 shadow-sm">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold text-slate-700">Belum ada riwayat pembayaran sewa</p>
              <p className="text-xs text-slate-500 mt-1">
                Lakukan pembayaran sewa melalui menu Sewa Kost.
              </p>
            </div>
          ) : (
            filteredKost.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                        item.kostLocation === 'acarya_2'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {item.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        Kamar {item.roomNumber} - {item.tenantName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {item.paymentMethod === 'bri' ? 'Transfer BRI' : 'Cash'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Periode: <strong className="text-slate-700">{item.periodStart} s/d {item.periodEnd}</strong> ({item.durationMonths} Bulan) • ID: {item.id}
                    </p>
                  </div>

                  <div>
                    {item.status === 'verified' ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sukses (Terverifikasi)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending (Menunggu Verifikasi)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Total Nominal:</span>
                    <strong className="text-sm font-bold text-indigo-700">
                      {formatRupiah(item.totalAmount)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.proofImage ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(item.proofImage!)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Bukti</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {item.paymentMethod === 'cash' ? 'Cash (Tanpa Struk)' : 'Tanpa Bukti'}
                      </span>
                    )}

                    {isAdmin && item.status === 'pending' && onVerifyPayment && (
                      <button
                        type="button"
                        onClick={() => onVerifyPayment('kost', item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Verifikasi Sukses (Kirim ke Sheet)
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Waktu Kirim: {item.createdAt}</span>
                  {item.status === 'verified' ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      ✓ Sukses & Dicatat ke Sheet Kamar
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      ⏳ Pending (Belum Masuk Sheet Kamar)
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          filteredElectricity.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200 shadow-sm">
              <Zap className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">Belum ada riwayat pembayaran listrik</p>
              <p className="text-xs text-slate-500 mt-1">
                Lakukan perhitungan meter dan bayar melalui menu Listrik kWh.
              </p>
            </div>
          ) : (
            filteredElectricity.map((el) => (
              <div
                key={el.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                        el.kostLocation === 'acarya_2'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {el.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        Kamar {el.roomNumber} - {el.tenantName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        Listrik {el.paymentMethod === 'bri' ? 'BRI' : 'Cash'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Periode: <strong className="text-slate-700">{el.periodMonth}</strong> • Stand: {el.initialKwh} ➔ {el.finalKwh} ({el.usageKwh} kWh)
                    </p>
                  </div>

                  <div>
                    {el.status === 'verified' ? (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sukses (Terverifikasi)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending (Menunggu Verifikasi)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Total Tagihan:</span>
                    <strong className="text-sm font-bold text-sky-700">
                      {formatRupiah(el.totalAmount)}
                    </strong>
                    <span className="text-[10px] text-slate-400 block">
                      (Biaya kWh + Mesin Rp 30.000)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {el.proofImage && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(el.proofImage!)}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-sky-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Bukti Transfer</span>
                      </button>
                    )}

                    {isAdmin && el.status === 'pending' && onVerifyPayment && (
                      <button
                        type="button"
                        onClick={() => onVerifyPayment('electricity', el.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Verifikasi Sukses (Kirim ke Sheet)
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>Waktu Kirim: {el.createdAt}</span>
                  {el.status === 'verified' ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      ✓ Sukses & Dicatat ke Sheet Kamar
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      ⏳ Pending (Belum Masuk Sheet Kamar)
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Preview Image Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl p-4 space-y-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Lampiran Bukti</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 max-h-96 overflow-auto flex items-center justify-center">
              <img
                src={previewImage}
                alt="Bukti Transfer"
                className="max-h-80 object-contain rounded-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
