import React, { useState } from 'react';
import {
  CreditCard,
  Building,
  Banknote,
  Copy,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings } from '../types';

interface PaymentMethodsModalProps {
  settings: AppSettings;
  onClose: () => void;
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({
  settings,
  onClose,
}) => {
  const [copiedBank, setCopiedBank] = useState(false);
  const [activeTab, setActiveTab] = useState<'bri' | 'cash'>('bri');

  const handleCopy = () => {
    navigator.clipboard.writeText(settings.briAccountNo.replace(/\D/g, ''));
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          id="btn-back-methods"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Metode Pembayaran Resmi
          </h2>
          <p className="text-xs text-slate-500">
            Pilihan pembayaran resmi kost: Transfer Bank BRI dan Tunai (Cash)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('bri')}
          className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'bri'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-blue-600" />
          <span>Transfer Bank BRI</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cash')}
          className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'cash'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Banknote className="w-4 h-4 text-emerald-600" />
          <span>Cash (Tunai Langsung)</span>
        </button>
      </div>

      {/* BRI Tab */}
      {activeTab === 'bri' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                BRI
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Transfer Bank Rakyat Indonesia (BRI)
                </h3>
                <p className="text-xs text-slate-500">
                  Dapat ditransfer via ATM, BRImo, SMS Banking, atau Antar Bank (Kode BRI: 002)
                </p>
              </div>
            </div>
          </div>

          {/* Card Account */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-xs opacity-75 font-medium">
              <span>REKENING PENERIMA PEMBAYARAN KOST</span>
              <span className="font-bold text-blue-400">BANK BRI</span>
            </div>

            <div>
              <div className="text-xs text-slate-400">Nomor Rekening:</div>
              <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider mt-0.5 text-white">
                {settings.briAccountNo}
              </div>
            </div>

            <div className="flex justify-between items-end pt-2 border-t border-slate-800">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Nama Pemilik Rekening:</div>
                <div className="text-sm font-bold tracking-wide text-slate-200">
                  {settings.briAccountName}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                {copiedBank ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBank ? 'Tersalin!' : 'Salin No Rek'}</span>
              </button>
            </div>
          </div>

          {/* Guide Steps */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-xs text-slate-700">
            <h4 className="font-bold text-slate-900">Petunjuk Transfer via BRImo / m-Banking:</h4>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600">
              <li>Buka aplikasi BRImo atau m-Banking bank Anda.</li>
              <li>Pilih menu <strong>Transfer</strong> ➔ <strong>Tambah Penerima Baru</strong>.</li>
              <li>Pilih Bank BRI dan masukkan nomor rekening di atas.</li>
              <li>Pastikan nama penerima tertera <strong>{settings.briAccountName}</strong>.</li>
              <li>Masukkan nominal tagihan sewa / listrik secara tepat.</li>
              <li>Simpan struk transaksi dan upload bukti di form pembayaran.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Cash Tab */}
      {activeTab === 'cash' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pembayaran Tunai (Cash) Langsung
              </h3>
              <p className="text-xs text-slate-500">
                Bayar tatap muka langsung kepada pengelola di kantor kost
              </p>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 space-y-3 text-xs text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Ketentuan Khusus Pembayaran Cash:</span>
            </div>
            <div className="space-y-1.5 leading-relaxed text-slate-700">
              <p>
                • <strong>Bebas Bukti Transfer:</strong> Anda <strong>TIDAK PERLU</strong> mengunggah foto bukti pembayaran di aplikasi jika membayar secara tunai.
              </p>
              <p>
                • Cukup pilih metode <strong>Cash</strong> di form Sewa Kost atau Listrik lalu tekan <strong>Kirim</strong>, data otomatis tercatat sebagai pembayaran tunai menunggu penerimaan uang.
              </p>
              <p>
                • Lokasi penyerahan tunai:
                <br />
                &nbsp;&nbsp;📍 <strong>Acarya Kost 1:</strong> Jl. Acarya I No. 10 (Lokasi 1)
                <br />
                &nbsp;&nbsp;📍 <strong>Acarya Kost 2:</strong> Jl. Acarya II No. 25 (Lokasi 2)
              </p>
              <p>
                • Petugas Penerima: <strong>{settings.adminName}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
