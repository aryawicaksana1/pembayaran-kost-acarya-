import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Send,
  MessageCircle,
  Home,
  CheckSquare,
  MapPin,
} from 'lucide-react';
import { FacilityMaintenance, RoomInspection, TenantProfile, AppSettings, KostLocation } from '../types';
import { buildWaLink } from '../utils/whatsappHelper';
import { sendToGoogleSheets } from '../utils/googleSheetsSync';

interface FacilityScheduleModalProps {
  currentTenant: TenantProfile;
  settings: AppSettings;
  facilities: FacilityMaintenance[];
  roomInspections: RoomInspection[];
  onClose: () => void;
  onReportFacilityIssue: (issue: any) => void;
}

export const FacilityScheduleModal: React.FC<FacilityScheduleModalProps> = ({
  currentTenant,
  settings,
  facilities,
  roomInspections,
  onClose,
  onReportFacilityIssue,
}) => {
  const [activeTab, setActiveTab] = useState<'mingguan' | 'enam_bulan' | 'lapor'>('mingguan');
  const [branchFilter, setBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [reportCategory, setReportCategory] = useState<string>('Air & Pompa');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const filteredFacilities =
    branchFilter === 'all'
      ? facilities
      : facilities.filter((f) => (f.kostLocation || 'acarya_1') === branchFilter);

  const filteredInspections =
    branchFilter === 'all'
      ? roomInspections
      : roomInspections.filter((r) => (r.kostLocation || 'acarya_1') === branchFilter);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    setIsSubmitting(true);
    const newReport = {
      id: `REP-${Date.now().toString().slice(-5)}`,
      kostLocation: currentTenant.kostLocation || 'acarya_1',
      category: reportCategory,
      title: reportDesc.trim(),
      roomNumber: currentTenant.roomNumber,
      tenantName: currentTenant.name,
      createdAt: new Date().toLocaleDateString('id-ID'),
      status: 'Menunggu Penanganan',
    };

    if (settings.googleWebAppUrl) {
      try {
        await sendToGoogleSheets(settings.googleWebAppUrl, {
          action: 'lapor_fasilitas',
          ...newReport,
        });
      } catch (err) {
        console.warn('Sync report error', err);
      }
    }

    onReportFacilityIssue(newReport);
    setIsSubmitting(false);
    setSubmittedSuccess(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selesai':
      case 'layak':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{status === 'layak' ? 'Kondisi Baik' : 'Selesai'}</span>
          </span>
        );
      case 'dalam_proses':
      case 'perlu_perbaikan':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{status === 'perlu_perbaikan' ? 'Perlu Perbaikan' : 'Dalam Proses'}</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Terjadwal</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-facilities"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Jadwal Pemeliharaan Fasilitas & Cek Kamar
          </h2>
          <p className="text-xs text-slate-500">
            Jadwal mingguan fasilitas dan inspeksi 6 bulanan untuk Acarya Kost 1 & 2
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('mingguan');
            setSubmittedSuccess(false);
          }}
          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'mingguan'
              ? 'bg-white text-teal-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Fasilitas (1 Minggu 1x)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('enam_bulan');
            setSubmittedSuccess(false);
          }}
          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'enam_bulan'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Cek Kamar (6 Bulan 1x)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('lapor');
            setSubmittedSuccess(false);
          }}
          className={`flex-1 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'lapor'
              ? 'bg-white text-indigo-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lapor Kendala
        </button>
      </div>

      {/* Branch Filter Pills */}
      {activeTab !== 'lapor' && (
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

      {/* TAB 1: Pemeliharaan Fasilitas Tiap 1 Minggu Sekali */}
      {activeTab === 'mingguan' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Siklus Pemeliharaan Rutin Mingguan</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold">
              Jadwal Pemeliharaan Fasilitas Bersama (Tiap 1 Minggu 1x)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Meliputi kuras toren, pompa air bersama, penerangan lorong, dapur bersama, dan stabilitas WiFi Acarya Kost 1 & 2.
            </p>
          </div>

          <div className="space-y-3">
            {filteredFacilities.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 border border-teal-100">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          f.kostLocation === 'acarya_2'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {f.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {f.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500">
                        Waktu: <span className="font-semibold text-slate-700">{f.targetDay}</span> • PIC: {f.pic}
                      </p>
                    </div>
                  </div>
                  <div>{getStatusBadge(f.status)}</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border border-slate-100">
                  <span>
                    Terakhir: <strong className="text-slate-800">{f.lastCheckedDate}</strong>
                  </span>
                  <span>
                    Jadwal Berikutnya (+1 mgg): <strong className="text-teal-700">{f.nextDate}</strong>
                  </span>
                </div>

                {f.notes && (
                  <p className="text-[11px] text-slate-500 italic pl-1">
                    Catatan: {f.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setActiveTab('lapor')}
              className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-teal-200"
            >
              <Plus className="w-4 h-4" />
              <span>Ada Fasilitas Rusak? Laporkan Di Sini</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Pengecekan Kamar Tiap 6 Bulan Sekali */}
      {activeTab === 'enam_bulan' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
              <Home className="w-3.5 h-3.5" />
              <span>Inspeksi Kamar Berkala 6 Bulanan</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold">
              Jadwal Pengecekan Fisik Kamar (Tiap 6 Bulan Sekali)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Pemeriksaan dinding, kran/plumbing air, ventilasi exhaust, dan kunci handle pintu untuk Acarya Kost 1 & 2.
            </p>
          </div>

          <div className="space-y-3">
            {filteredInspections.map((r) => {
              const isCurrentTenantRoom = r.roomNumber === currentTenant.roomNumber;
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-xl p-4 border transition-all space-y-2.5 shadow-sm ${
                    isCurrentTenantRoom
                      ? 'border-indigo-500 ring-2 ring-indigo-100'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        r.kostLocation === 'acarya_2'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {r.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
                        {r.roomNumber}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Kamar {r.roomNumber} - {r.tenantName}
                        </h4>
                        {isCurrentTenantRoom && (
                          <span className="text-[10px] text-indigo-600 font-bold">
                            (Kamar Anda Saat Ini)
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Inspeksi Terakhir:</span>
                      <strong className="text-slate-800">{r.lastInspectionDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Jadwal Cek Berikutnya:</span>
                      <strong className="text-indigo-700">{r.nextInspectionDate}</strong>
                    </div>
                  </div>

                  {/* Checklist detail */}
                  <div className="text-xs text-slate-600 space-y-1 pl-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dinding & Cat: {r.wallCondition}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kran & Saluran Air: {r.plumbingCondition}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ventilasi & Jendela: {r.ventilationCondition}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pintu & Kunci: {r.doorAndLockCondition}</span>
                    </div>
                  </div>

                  {r.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      Catatan Pengelola: {r.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Form Lapor Kendala Fasilitas */}
      {activeTab === 'lapor' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Formulir Laporan Kerusakan Fasilitas
              </h3>
              <p className="text-xs text-slate-500">
                Laporkan kerusakan kamar/fasilitas untuk ditindaklanjuti pengelola
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
              currentTenant.kostLocation === 'acarya_2'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              {currentTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'} • Kmr {currentTenant.roomNumber}
            </span>
          </div>

          {submittedSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-950">Laporan Berhasil Terkirim!</h4>
              <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                Laporan kerusakan fasilitas Anda telah dicatat di sistem pengelola dan diteruskan ke Google Sheet.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittedSuccess(false)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Buat Laporan Baru
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Kendala:
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50 text-slate-800 font-medium"
                >
                  <option value="Air & Pompa">Kran / Air Bersama / Pompa Mati</option>
                  <option value="Listrik & Lampu">Lampu Kamar / Saklar / Listrik Konslet</option>
                  <option value="WiFi & Internet">Koneksi WiFi Lemot / Tidak Bisa Connect</option>
                  <option value="Pintu & Kunci">Kunci Kamar Macet / Handle Rusak</option>
                  <option value="Kebersihan">Sampah Menumpuk / Area Dapur Kotor</option>
                  <option value="Lainnya">Kendala Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Kerusakan / Kendala:
                </label>
                <textarea
                  rows={4}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Jelaskan secara singkat kendala fasilitas yang Anda alami..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-indigo-500 bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan Kerusakan'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
