import React, { useState } from 'react';
import {
  MessageCircle,
  BellRing,
  ArrowLeft,
  Send,
  Calendar,
  Zap,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Copy,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { TenantProfile, AppSettings, KostLocation } from '../types';
import {
  formatRupiah,
  buildWaLink,
  generateRentReminderMessage,
  generateElectricityReminderMessage,
} from '../utils/whatsappHelper';

interface WhatsAppNotificationModalProps {
  tenants: TenantProfile[];
  settings: AppSettings;
  onClose: () => void;
}

export const WhatsAppNotificationModal: React.FC<WhatsAppNotificationModalProps> = ({
  tenants,
  settings,
  onClose,
}) => {
  const [reminderType, setReminderType] = useState<'sewa' | 'listrik'>('sewa');
  const [branchFilter, setBranchFilter] = useState<'all' | 'acarya_1' | 'acarya_2'>('all');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [copiedText, setCopiedText] = useState(false);

  const filteredTenants =
    branchFilter === 'all'
      ? tenants
      : tenants.filter((t) => (t.kostLocation || 'acarya_1') === branchFilter);

  const selectedTenant =
    filteredTenants.find((t) => t.id === selectedTenantId) ||
    filteredTenants[0] ||
    tenants[0];

  const generatedMessage =
    reminderType === 'sewa'
      ? generateRentReminderMessage(selectedTenant, settings)
      : generateElectricityReminderMessage(selectedTenant, settings);

  const waLink = buildWaLink(selectedTenant.phone, generatedMessage);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="btn-back-wa"
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sistem Notifikasi WhatsApp Otomatis
          </h2>
          <p className="text-xs text-slate-500">
            Kirim pengingat jatuh tempo sewa dan tagihan listrik pulsa untuk Acarya Kost 1 & 2
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle Reminder Category */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setReminderType('sewa')}
            className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              reminderType === 'sewa'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Pengingat Sewa Kost</span>
          </button>
          <button
            type="button"
            onClick={() => setReminderType('listrik')}
            className={`py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              reminderType === 'listrik'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Pengingat Listrik kWh</span>
          </button>
        </div>

        {/* Branch Filter Tabs */}
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
              Semua ({tenants.length})
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

        {/* Tenant Selection Bar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Pilih Nomor Kamar Penerima Notifikasi:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filteredTenants.map((t) => {
              const isSelected = t.id === selectedTenant.id;
              const status = reminderType === 'sewa' ? t.activeRentStatus : t.activeElectricityStatus;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTenantId(t.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      Kamar {t.roomNumber}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        status === 'lunas'
                          ? 'bg-emerald-500'
                          : status === 'jatuh_tempo'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      t.kostLocation === 'acarya_2' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {t.kostLocation === 'acarya_2' ? 'Kost 2' : 'Kost 1'}
                    </span>
                    <span className="font-bold text-slate-700">
                      {reminderType === 'sewa' ? formatRupiah(t.monthlyRentRate) : 'Listrik'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Format Pesan WhatsApp Siap Kirim
                </h4>
                <p className="text-[10px] text-slate-500">
                  Ditujukan ke {selectedTenant.name} ({selectedTenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1'} • Kamar {selectedTenant.roomNumber})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-xs text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedText ? 'Tersalin!' : 'Salin Pesan'}</span>
            </button>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {generatedMessage}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <a
              id="btn-send-wa-direct"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Buka WhatsApp & Kirim ke Penghuni</span>
            </a>

            {selectedTenant.parentPhone && selectedTenant.parentPhone !== '-' && (
              <a
                href={buildWaLink(selectedTenant.parentPhone, generatedMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Kirim pemberitahuan ini ke nomor WhatsApp orang tua"
              >
                <Send className="w-4 h-4" />
                <span>Kirim ke WA Ortu ({selectedTenant.parentPhone})</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
