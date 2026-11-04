import React, { useState } from 'react';
import {
  Fan,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Send,
  MessageCircle,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { AcServiceRecord, TenantProfile, AppSettings, KostLocation } from '../types';
import { buildWaLink } from '../utils/whatsappHelper';
import { sendToGoogleSheets } from '../utils/googleSheetsSync';

interface AcServiceModalProps {
  currentTenant: TenantProfile;
  settings: AppSettings;
  acServices: AcServiceRecord[];
  onClose: () => void;
  onRequestAcService: (record: any) => void;
}

export const AcServiceModal: React.FC<AcServiceModalProps> = ({
  currentTenant,
  settings,
  acServices,
  onClose,
  onRequestAcService,
}) => {
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);
  const [branchFilter, setBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [acCondition, setAcCondition] = useState<string>('perlu_dicuci');
  const [tenantNotes, setTenantNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  // Find tenant's room AC
  const tenantAc = acServices.find((a) => a.roomNumber === currentTenant.roomNumber);

  const filteredAcServices =
    branchFilter === 'all'
      ? acServices
      : acServices.filter((a) => (a.kostLocation || 'acarya_1') === branchFilter);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      action: 'booking_ac',
      id: `AC-REQ-${Date.now().toString().slice(-4)}`,
      kostLocation: currentTenant.kostLocation || 'acarya_1',
      roomNumber: currentTenant.roomNumber,
      tenantName: currentTenant.name,
      acBrand: tenantAc?.acBrand || 'AC Kamar',
      status: acCondition,
      nextServiceDate: 'Jadwal 6 Bulanan',
      notes: tenantNotes,
      createdAt: new Date().toLocaleDateString('id-ID'),
    };

    if (settings.googleWebAppUrl) {
      try {
        await sendToGoogleSheets(settings.googleWebAppUrl, payload);
      } catch (err) {
        console.warn('Sync AC booking error', err);
      }
    }

    onRequestAcService(payload);
    setIsSubmitting(false);
    setSubmittedSuccess(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Dingin Normal</span>
          </span>
        );
      case 'kurang_dingin':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Kurang Dingin</span>
          </span>
        );
      case 'perlu_dicuci':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Fan className="w-3 h-3" />
            <span>Jadwal Cuci (6 Bln)</span>
          </span>
        );
      case 'rusak':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Perlu Teknisi</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-ac"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Jadwal Servis AC (Tiap 6 Bulan Sekali)
          </h2>
          <p className="text-xs text-slate-500">
            Pemeliharaan berkala cuci filter & freon unit AC untuk Acarya Kost 1 & 2
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Banner Hero */}
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-sky-400">
            <Fan className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Pemeliharaan Berkala Tiap 6 Bulan</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold">
              Status AC: Kamar {currentTenant.roomNumber} ({currentTenant.name})
            </h3>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              currentTenant.kostLocation === 'acarya_2'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
            }`}>
              {currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Untuk menjaga udara kamar tetap segar, dingin optimal, dan hemat listrik pulsa, servis cuci AC dilakukan rutin setiap 6 bulan sekali.
          </p>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              {showRequestForm ? 'Tutup Formulir' : 'Ajukan Request Cuci / Cek AC'}
            </button>
          </div>
        </div>

        {/* Request Form if opened */}
        {showRequestForm && (
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Formulir Permintaan Servis AC Kamar {currentTenant.roomNumber}</span>
            </h4>

            {submittedSuccess ? (
              <div className="bg-emerald-50 rounded-lg p-4 text-center space-y-3 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h5 className="text-xs font-bold text-emerald-950">
                  Permintaan Servis AC Berhasil Terkirim!
                </h5>
                <p className="text-[11px] text-slate-600">
                  Data telah dicatat dan masuk ke Google Sheets pengelola. Anda juga dapat konfirmasi langsung ke pengelola via WhatsApp.
                </p>
                <a
                  href={buildWaLink(
                    settings.adminPhone,
                    `Halo Pengelola Kost, saya ${currentTenant.name} (${currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'} - Kamar ${currentTenant.roomNumber}) ingin mengajukan servis AC: ${tenantNotes || 'Pencucian AC berkala 6 bulan'}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Pesan WhatsApp</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kondisi AC Saat Ini:
                  </label>
                  <select
                    value={acCondition}
                    onChange={(e) => setAcCondition(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="perlu_dicuci">Sudah 6 Bulan / Perlu Dicuci</option>
                    <option value="kurang_dingin">Kurang Dingin / Angin Lemah</option>
                    <option value="rusak">Bocor Air / Bunyi Berisik / Rusak</option>
                    <option value="normal">Normal (Servis Rutin Berkala)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Gejala Kendala:
                  </label>
                  <textarea
                    value={tenantNotes}
                    onChange={(e) => setTenantNotes(e.target.value)}
                    rows={2}
                    placeholder="Contoh: AC mulai berdebu dan agak meneteskan air saat malam hari..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim Permintaan Servis AC'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Branch Filter Tabs for Master List */}
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

        {/* Master List of AC by Room */}
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Daftar Jadwal Servis AC per Kamar ({branchFilter === 'all' ? 'Acarya Kost 1 & 2' : branchFilter === 'acarya_1' ? 'Acarya Kost 1' : 'Acarya Kost 2'})
          </h4>

          {filteredAcServices.map((ac) => {
            const isMyRoom = ac.roomNumber === currentTenant.roomNumber;
            return (
              <div
                key={ac.id}
                className={`bg-white rounded-xl p-4 border transition-all space-y-2 shadow-sm ${
                  isMyRoom
                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      ac.kostLocation === 'acarya_2'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
                      {ac.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs border border-sky-200">
                      {ac.roomNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-slate-900">
                          Kamar {ac.roomNumber} - {ac.tenantName}
                        </h5>
                        {isMyRoom && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            Kamar Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Unit: {ac.acBrand}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(ac.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Servis Terakhir:</span>
                    <strong className="text-slate-800">{ac.lastServiceDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jadwal Berikutnya (+6 Bln):</span>
                    <strong className="text-indigo-700">{ac.nextServiceDate}</strong>
                  </div>
                </div>

                {ac.notes && (
                  <p className="text-[11px] text-slate-500 italic pl-1">
                    Catatan: {ac.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
