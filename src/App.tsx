/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { AppLauncherGrid, ActiveScreen } from './components/AppLauncherGrid';
import { RentPaymentModal } from './components/RentPaymentModal';
import { ElectricityPaymentModal } from './components/ElectricityPaymentModal';
import { FacilityScheduleModal } from './components/FacilityScheduleModal';
import { AcServiceModal } from './components/AcServiceModal';
import { PaymentMethodsModal } from './components/PaymentMethodsModal';
import { WhatsAppNotificationModal } from './components/WhatsAppNotificationModal';
import { PaymentHistoryModal } from './components/PaymentHistoryModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { GoogleSheetsSetupModal } from './components/GoogleSheetsSetupModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { AppFooter } from './components/AppFooter';
import { sendToGoogleSheets, fetchRoomRatesFromGoogleSheets } from './utils/googleSheetsSync';

import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_TENANTS,
  DEFAULT_FACILITY_MAINTENANCE,
  DEFAULT_ROOM_INSPECTIONS,
  DEFAULT_AC_SERVICES,
  INITIAL_KOST_PAYMENTS,
  INITIAL_ELECTRICITY_PAYMENTS,
} from './constants/defaultData';
import {
  TenantProfile,
  AppSettings,
  KostPaymentRecord,
  ElectricityRecord,
  FacilityMaintenance,
  RoomInspection,
  AcServiceRecord,
  KostLocation,
  AuthSession,
} from './types';

export default function App() {
  // Load state from localStorage or defaults with automatic migration
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('kostpay_settings');
    if (saved) {
      try {
        const parsed: AppSettings = JSON.parse(saved);
        let updated = { ...parsed };
        if (parsed.kostName === 'Kost Griya Mandiri Sejahtera' || !parsed.kostName.includes('Acarya')) {
          updated = {
            ...updated,
            kostName: DEFAULT_APP_SETTINGS.kostName,
            adminName: DEFAULT_APP_SETTINGS.adminName,
            kostAddress: DEFAULT_APP_SETTINGS.kostAddress,
            briAccountName: DEFAULT_APP_SETTINGS.briAccountName,
            briAccountNo: DEFAULT_APP_SETTINGS.briAccountNo,
          };
        }
        if (!parsed.briAccountNo || parsed.briAccountNo.startsWith('0123-01')) {
          updated = {
            ...updated,
            briAccountNo: DEFAULT_APP_SETTINGS.briAccountNo,
          };
        }
        if (!parsed.googleWebAppUrl || parsed.googleWebAppUrl !== DEFAULT_APP_SETTINGS.googleWebAppUrl) {
          updated = {
            ...updated,
            googleWebAppUrl: DEFAULT_APP_SETTINGS.googleWebAppUrl,
          };
        }
        return updated;
      } catch {
        return DEFAULT_APP_SETTINGS;
      }
    }
    return DEFAULT_APP_SETTINGS;
  });

  // User Authentication Session (either room tenant or admin)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('kostpay_auth_session_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Backward compatibility for admin
    if (localStorage.getItem('kostpay_auth_user') === 'bosacarya') {
      return {
        role: 'admin',
        username: 'bosacarya',
        name: 'BOS ACARYA (Pengelola)',
      };
    }
    return null;
  });

  const [tenants, setTenants] = useState<TenantProfile[]>(() => {
    const saved = localStorage.getItem('kostpay_tenants_v3');
    if (saved) {
      try {
        const parsed: TenantProfile[] = JSON.parse(saved);
        if (parsed.length < 20 || !parsed.some((t) => t.name.includes('ARYA WICAKSANA'))) {
          return DEFAULT_TENANTS;
        }
        // Ensure every tenant has username and password populated
        return parsed.map((t) => ({
          ...t,
          username: t.username || `kamar${t.roomNumber}`,
          password: t.password || `acarya${t.kostLocation === 'acarya_2' ? '2' : '1'}-${t.roomNumber}`,
        }));
      } catch {
        return DEFAULT_TENANTS;
      }
    }
    return DEFAULT_TENANTS;
  });

  const [currentTenant, setCurrentTenant] = useState<TenantProfile>(() => {
    if (authSession?.role === 'tenant' && authSession.tenantId) {
      const match = DEFAULT_TENANTS.find((t) => t.id === authSession.tenantId);
      if (match) return match;
    }
    const defaultArya = DEFAULT_TENANTS.find((t) => t.name.includes('ARYA WICAKSANA'));
    return defaultArya || DEFAULT_TENANTS[0];
  });

  const [kostPayments, setKostPayments] = useState<KostPaymentRecord[]>(() => {
    const saved = localStorage.getItem('kostpay_kost_payments_v2');
    if (saved) {
      try {
        const parsed: KostPaymentRecord[] = JSON.parse(saved);
        if (parsed.some((p) => p.tenantName === 'Rian Pratama')) {
          return INITIAL_KOST_PAYMENTS;
        }
        return parsed;
      } catch {
        return INITIAL_KOST_PAYMENTS;
      }
    }
    return INITIAL_KOST_PAYMENTS;
  });

  const [electricityPayments, setElectricityPayments] = useState<ElectricityRecord[]>(() => {
    const saved = localStorage.getItem('kostpay_elec_payments_v2');
    if (saved) {
      try {
        const parsed: ElectricityRecord[] = JSON.parse(saved);
        if (parsed.some((p) => p.tenantName === 'Siti Nurhaliza')) {
          return INITIAL_ELECTRICITY_PAYMENTS;
        }
        return parsed;
      } catch {
        return INITIAL_ELECTRICITY_PAYMENTS;
      }
    }
    return INITIAL_ELECTRICITY_PAYMENTS;
  });

  const [facilities, setFacilities] = useState<FacilityMaintenance[]>(() => {
    const saved = localStorage.getItem('kostpay_facilities');
    if (saved) {
      try {
        const parsed: FacilityMaintenance[] = JSON.parse(saved);
        if (parsed.length < 6 || parsed.some((f) => !f.kostLocation)) {
          return DEFAULT_FACILITY_MAINTENANCE;
        }
        return parsed;
      } catch {
        return DEFAULT_FACILITY_MAINTENANCE;
      }
    }
    return DEFAULT_FACILITY_MAINTENANCE;
  });

  const [roomInspections, setRoomInspections] = useState<RoomInspection[]>(() => {
    const saved = localStorage.getItem('kostpay_inspections_v2');
    if (saved) {
      try {
        const parsed: RoomInspection[] = JSON.parse(saved);
        if (parsed.some((r) => r.roomNumber === '101')) {
          return DEFAULT_ROOM_INSPECTIONS;
        }
        return parsed;
      } catch {
        return DEFAULT_ROOM_INSPECTIONS;
      }
    }
    return DEFAULT_ROOM_INSPECTIONS;
  });

  const [acServices, setAcServices] = useState<AcServiceRecord[]>(() => {
    const saved = localStorage.getItem('kostpay_ac_services_v2');
    if (saved) {
      try {
        const parsed: AcServiceRecord[] = JSON.parse(saved);
        if (parsed.some((a) => a.roomNumber === '101')) {
          return DEFAULT_AC_SERVICES;
        }
        return parsed;
      } catch {
        return DEFAULT_AC_SERVICES;
      }
    }
    return DEFAULT_AC_SERVICES;
  });

  const [selectedLocation, setSelectedLocation] = useState<KostLocation | 'all'>('acarya_2');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return authSession?.role === 'admin';
  });
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');

  // Authentication State for Admin
  const isLoggedIn = authSession?.role === 'admin';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [pendingTargetScreen, setPendingTargetScreen] = useState<ActiveScreen | null>(null);

  // Sync login status to localStorage
  useEffect(() => {
    if (authSession) {
      localStorage.setItem('kostpay_auth_session_v2', JSON.stringify(authSession));
      if (authSession.role === 'admin') {
        localStorage.setItem('kostpay_auth_user', 'bosacarya');
      } else {
        localStorage.removeItem('kostpay_auth_user');
      }
    } else {
      localStorage.removeItem('kostpay_auth_session_v2');
      localStorage.removeItem('kostpay_auth_user');
    }
  }, [authSession]);

  // Protected screens requiring admin login: pengingat wa, admin kost, google sheets
  // Note: riwayat bayar is available to tenants to check their own room transactions!
  const ADMIN_PROTECTED_SCREENS: ActiveScreen[] = [
    'pengingat_wa',
    'admin_kost',
    'google_sheets',
  ];

  const getScreenTitle = (screen: ActiveScreen | null): string => {
    switch (screen) {
      case 'pengingat_wa':
        return 'Notifikasi WA (Khusus Admin)';
      case 'riwayat_bayar':
        return 'Riwayat Bayar';
      case 'admin_kost':
        return 'Admin Kost';
      case 'google_sheets':
        return 'Google Sheet';
      default:
        return 'Pengelola Kost';
    }
  };

  const handleOpenScreen = (screen: ActiveScreen) => {
    if (ADMIN_PROTECTED_SCREENS.includes(screen) && !isLoggedIn) {
      if (authSession?.role === 'tenant') {
        // Menu notifikasi WhatsApp dan admin hanya bisa diakses oleh admin
        return;
      }
      setPendingTargetScreen(screen);
      setIsLoginModalOpen(true);
      return;
    }
    setActiveScreen(screen);
  };

  const handleSuccessLogin = () => {
    const adminSession: AuthSession = {
      role: 'admin',
      username: 'bosacarya',
      name: 'BOS ACARYA (Pengelola)',
    };
    setAuthSession(adminSession);
    setIsAdminMode(true);
    setIsLoginModalOpen(false);
    if (pendingTargetScreen) {
      setActiveScreen(pendingTargetScreen);
      setPendingTargetScreen(null);
    } else {
      setActiveScreen('admin_kost');
    }
  };

  const handleLogout = () => {
    setAuthSession(null);
    setIsAdminMode(false);
    localStorage.removeItem('kostpay_auth_session_v2');
    localStorage.removeItem('kostpay_auth_user');
    setActiveScreen('home');
  };

  const handleUpdateTenant = (updated: TenantProfile) => {
    setTenants((prev) => {
      const updatedList = prev.map((t) => (t.id === updated.id ? updated : t));
      localStorage.setItem('kostpay_tenants_v3', JSON.stringify(updatedList));
      return updatedList;
    });
    if (currentTenant.id === updated.id) {
      setCurrentTenant(updated);
    }
  };

  const handleUpdateAllTenants = (updatedTenants: TenantProfile[]) => {
    setTenants(updatedTenants);
    localStorage.setItem('kostpay_tenants_v3', JSON.stringify(updatedTenants));
    // Also update currentTenant if it was among updated
    const updatedCurrent = updatedTenants.find((t) => t.id === currentTenant.id);
    if (updatedCurrent) {
      setCurrentTenant(updatedCurrent);
    }
  };

  // Background Auto-sync room rates from Google Sheet tab DAFTAR_TARIF_KAMAR
  useEffect(() => {
    if (!settings.googleWebAppUrl) return;

    let isMounted = true;
    const syncRatesOnMount = async () => {
      try {
        const res = await fetchRoomRatesFromGoogleSheets(settings.googleWebAppUrl);
        if (!isMounted) return;

        if (res.success && res.rates && res.rates.length > 0) {
          setTenants((prevTenants) => {
            let hasChanges = false;
            const merged = prevTenants.map((t) => {
              const match = res.rates?.find(
                (r) =>
                  r.roomNumber.toString().trim() === t.roomNumber.toString().trim() &&
                  (!r.kostLocation || r.kostLocation === t.kostLocation)
              );
              if (match && match.monthlyRentRate && match.monthlyRentRate > 0) {
                const isRateChanged = t.monthlyRentRate !== match.monthlyRentRate;
                const isNameChanged =
                  match.tenantName &&
                  match.tenantName.indexOf('Tersedia') === -1 &&
                  match.tenantName.length > 2 &&
                  t.name !== match.tenantName;
                const isDueDayChanged = match.rentDueDateDay && t.rentDueDateDay !== match.rentDueDateDay;

                if (isRateChanged || isNameChanged || isDueDayChanged) {
                  hasChanges = true;
                  return {
                    ...t,
                    monthlyRentRate: match.monthlyRentRate,
                    name: isNameChanged ? (match.tenantName as string) : t.name,
                    rentDueDateDay: match.rentDueDateDay || t.rentDueDateDay,
                  };
                }
              }
              return t;
            });

            if (hasChanges) {
              localStorage.setItem('kostpay_tenants_v3', JSON.stringify(merged));
              setCurrentTenant((prevCurrent) => {
                const updatedCurrent = merged.find((t) => t.id === prevCurrent.id);
                return updatedCurrent || prevCurrent;
              });
            }
            return hasChanges ? merged : prevTenants;
          });
        }
      } catch (err) {
        // Silent fail for background sync
        console.warn('Auto-sync room rates notice:', err);
      }
    };

    syncRatesOnMount();
    return () => {
      isMounted = false;
    };
  }, [settings.googleWebAppUrl]);

  // Switch Location handler
  const handleSelectLocation = (loc: KostLocation | 'all') => {
    setSelectedLocation(loc);
    if (loc !== 'all') {
      const match = tenants.find((t) => t.kostLocation === loc);
      if (match && currentTenant.kostLocation !== loc) {
        setCurrentTenant(match);
      }
    }
  };

  const handleSelectTenant = (tenant: TenantProfile) => {
    setCurrentTenant(tenant);
    if (tenant.kostLocation && selectedLocation !== 'all' && selectedLocation !== tenant.kostLocation) {
      setSelectedLocation(tenant.kostLocation);
    }
  };

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('kostpay_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('kostpay_tenants_v3', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('kostpay_kost_payments_v2', JSON.stringify(kostPayments));
  }, [kostPayments]);

  useEffect(() => {
    localStorage.setItem('kostpay_elec_payments_v2', JSON.stringify(electricityPayments));
  }, [electricityPayments]);

  useEffect(() => {
    localStorage.setItem('kostpay_facilities', JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem('kostpay_inspections_v2', JSON.stringify(roomInspections));
  }, [roomInspections]);

  useEffect(() => {
    localStorage.setItem('kostpay_ac_services_v2', JSON.stringify(acServices));
  }, [acServices]);

  // Handler: Rent Payment Submitted (Status tetap 'pending', belum masuk sheet kamar)
  const handleSubmitRentPayment = (newRecord: KostPaymentRecord) => {
    setKostPayments((prev) => [newRecord, ...prev]);
  };

  // Handler: Electricity Payment Submitted (Status tetap 'pending', belum masuk sheet kamar)
  const handleSubmitElectricityPayment = (newRecord: ElectricityRecord) => {
    setElectricityPayments((prev) => [newRecord, ...prev]);
  };

  // Handler: Verification by admin
  // 1. Ubah status 'pending' menjadi 'verified' (Sukses)
  // 2. Tandai status sewa / listrik penghuni menjadi 'lunas'
  // 3. LANGSUNG kirim dan catat data ke sheet kamar yang telah dipisahkan di Google Sheets!
  const handleVerifyPayment = async (
    type: 'kost' | 'electricity',
    id: string
  ): Promise<{ success: boolean; message: string; sentToSheets: boolean }> => {
    if (type === 'kost') {
      const target = kostPayments.find((p) => p.id === id);
      if (!target) {
        return { success: false, message: 'Data pembayaran sewa tidak ditemukan.', sentToSheets: false };
      }

      const hasUrl = !!(settings.googleWebAppUrl && settings.googleWebAppUrl.trim());
      const updatedRecord: KostPaymentRecord = {
        ...target,
        status: 'verified',
        syncedToSheets: hasUrl,
      };

      setKostPayments((prev) =>
        prev.map((p) => (p.id === id ? updatedRecord : p))
      );

      setTenants((prev) =>
        prev.map((t) =>
          t.roomNumber === target.roomNumber && (t.kostLocation || 'acarya_1') === (target.kostLocation || 'acarya_1')
            ? { ...t, activeRentStatus: 'lunas' }
            : t
        )
      );

      if (
        currentTenant.roomNumber === target.roomNumber &&
        (currentTenant.kostLocation || 'acarya_1') === (target.kostLocation || 'acarya_1')
      ) {
        setCurrentTenant((prev) => ({ ...prev, activeRentStatus: 'lunas' }));
      }

      // Kirim langsung ke Google Sheets (masuk ke sheet kamar penghuni)
      if (hasUrl) {
        try {
          const res = await sendToGoogleSheets(settings.googleWebAppUrl.trim(), {
            action: 'pembayaran_kost',
            ...updatedRecord,
            status: 'Sukses',
            hasProof: !!target.proofImage,
          });

          if (res.success) {
            return {
              success: true,
              message: `Pembayaran Sewa Kamar ${target.roomNumber} (${target.tenantName}) BERHASIL diverifikasi! Status menjadi SUKSES dan data otomatis telah tercatat di sheet kamar Google Sheets.`,
              sentToSheets: true,
            };
          } else {
            return {
              success: true,
              message: `Pembayaran Sewa Kamar ${target.roomNumber} diverifikasi SUKSES di aplikasi. Namun respons Google Sheets: "${res.message}". Pastikan Web App di-Deploy Versi Baru dengan akses Anyone.`,
              sentToSheets: false,
            };
          }
        } catch (err: any) {
          console.error('Gagal mencatat pembayaran sewa kost ke sheet kamar Google Sheets:', err);
          return {
            success: true,
            message: `Pembayaran diverifikasi SUKSES secara lokal. Pengiriman ke Google Sheets gagal: ${err?.message || 'Koneksi terputus'}. Silakan periksa URL Web App Anda.`,
            sentToSheets: false,
          };
        }
      } else {
        return {
          success: true,
          message: `Pembayaran Sewa Kamar ${target.roomNumber} (${target.tenantName}) diverifikasi SUKSES di aplikasi. Namun data BELUM masuk ke Google Sheets karena URL Web App belum diisi di menu Pengaturan Google Sheets.`,
          sentToSheets: false,
        };
      }
    } else {
      const target = electricityPayments.find((p) => p.id === id);
      if (!target) {
        return { success: false, message: 'Data pembayaran listrik tidak ditemukan.', sentToSheets: false };
      }

      const hasUrl = !!(settings.googleWebAppUrl && settings.googleWebAppUrl.trim());
      const updatedRecord: ElectricityRecord = {
        ...target,
        status: 'verified',
        syncedToSheets: hasUrl,
      };

      setElectricityPayments((prev) =>
        prev.map((p) => (p.id === id ? updatedRecord : p))
      );

      setTenants((prev) =>
        prev.map((t) =>
          t.roomNumber === target.roomNumber && (t.kostLocation || 'acarya_1') === (target.kostLocation || 'acarya_1')
            ? {
                ...t,
                activeElectricityStatus: 'lunas',
                lastInitialKwh: target.finalKwh,
              }
            : t
        )
      );

      if (
        currentTenant.roomNumber === target.roomNumber &&
        (currentTenant.kostLocation || 'acarya_1') === (target.kostLocation || 'acarya_1')
      ) {
        setCurrentTenant((prev) => ({
          ...prev,
          activeElectricityStatus: 'lunas',
          lastInitialKwh: target.finalKwh,
        }));
      }

      // Kirim langsung ke Google Sheets (masuk ke sheet kamar penghuni)
      if (hasUrl) {
        try {
          const res = await sendToGoogleSheets(settings.googleWebAppUrl.trim(), {
            action: 'pembayaran_listrik',
            ...updatedRecord,
            status: 'Sukses',
            hasProof: !!target.proofImage,
          });

          if (res.success) {
            return {
              success: true,
              message: `Pembayaran Listrik Kamar ${target.roomNumber} (${target.tenantName}) BERHASIL diverifikasi! Status menjadi SUKSES dan data otomatis telah tercatat di sheet kamar Google Sheets.`,
              sentToSheets: true,
            };
          } else {
            return {
              success: true,
              message: `Pembayaran Listrik Kamar ${target.roomNumber} diverifikasi SUKSES di aplikasi. Namun respons Google Sheets: "${res.message}". Pastikan Web App di-Deploy Versi Baru dengan akses Anyone.`,
              sentToSheets: false,
            };
          }
        } catch (err: any) {
          console.error('Gagal mencatat pembayaran listrik ke sheet kamar Google Sheets:', err);
          return {
            success: true,
            message: `Pembayaran diverifikasi SUKSES secara lokal. Pengiriman ke Google Sheets gagal: ${err?.message || 'Koneksi terputus'}. Silakan periksa URL Web App Anda.`,
            sentToSheets: false,
          };
        }
      } else {
        return {
          success: true,
          message: `Pembayaran Listrik Kamar ${target.roomNumber} (${target.tenantName}) diverifikasi SUKSES di aplikasi. Namun data BELUM masuk ke Google Sheets karena URL Web App belum diisi di menu Pengaturan Google Sheets.`,
          sentToSheets: false,
        };
      }
    }
  };

  // Handler: Report Facility Issue
  const handleReportFacilityIssue = (newReport: any) => {
    const newFacilityItem: FacilityMaintenance = {
      id: newReport.id,
      kostLocation: newReport.kostLocation || currentTenant.kostLocation || 'acarya_1',
      title: `${newReport.category}: ${newReport.title} (Kmr ${newReport.roomNumber})`,
      category: 'kebersihan',
      frequency: 'mingguan',
      targetDay: 'Segera',
      nextDate: new Date().toLocaleDateString('id-ID'),
      lastCheckedDate: 'Hari Ini',
      status: 'dalam_proses',
      notes: `Dilaporkan oleh ${newReport.tenantName}. Menunggu tindak lanjut pengelola.`,
      pic: 'Pengelola Kost',
    };
    setFacilities((prev) => [newFacilityItem, ...prev]);
  };

  // Handler: Request AC Service
  const handleRequestAcService = (req: any) => {
    setAcServices((prev) =>
      prev.map((ac) =>
        ac.roomNumber === req.roomNumber
          ? {
              ...ac,
              status: req.status,
              notes: req.notes || ac.notes,
            }
          : ac
      )
    );
  };

  // Handler: Update app settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const pendingRentCount = kostPayments.filter((p) => p.status === 'pending').length;
  const pendingElecCount = electricityPayments.filter((p) => p.status === 'pending').length;
  const acServiceDue = acServices.filter(
    (a) => a.status === 'perlu_dicuci' || a.status === 'kurang_dingin' || a.status === 'rusak'
  ).length;

  // When no session is active, require login so no one can view any room's dashboard
  if (!authSession) {
    return (
      <LoginPage
        tenants={tenants}
        onLoginSuccess={(session, tenant) => {
          setAuthSession(session);
          if (session.role === 'admin') {
            setIsAdminMode(true);
            setActiveScreen('home');
          } else if (tenant) {
            setCurrentTenant(tenant);
            if (tenant.kostLocation) {
              setSelectedLocation(tenant.kostLocation);
            }
            setIsAdminMode(false);
            setActiveScreen('home');
          }
        }}
        selectedLocation={selectedLocation}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-20 sm:pb-16">
      {/* Top Header */}
      <AppHeader
        currentTenant={currentTenant}
        tenants={tenants}
        onSelectTenant={handleSelectTenant}
        isAdminMode={isAdminMode}
        onToggleAdminMode={(val) => {
          if (!isLoggedIn) {
            setPendingTargetScreen('admin_kost');
            setIsLoginModalOpen(true);
            return;
          }
          setIsAdminMode(val);
          if (val) {
            setActiveScreen('admin_kost');
          } else if (activeScreen === 'admin_kost') {
            setActiveScreen('home');
          }
        }}
        isLoggedIn={isLoggedIn}
        onOpenLogin={() => {
          setPendingTargetScreen('admin_kost');
          setIsLoginModalOpen(true);
        }}
        onLogout={handleLogout}
        settings={settings}
        onOpenWhatsAppReminders={() => handleOpenScreen('pengingat_wa')}
        onOpenGoogleSheets={() => handleOpenScreen('google_sheets')}
        selectedLocation={selectedLocation}
        onSelectLocation={handleSelectLocation}
        authSession={authSession}
      />

      {/* Main Screen Router */}
      <main className="flex-1 w-full max-w-5xl lg:max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeScreen === 'home' && (
          <AppLauncherGrid
            currentTenant={currentTenant}
            settings={settings}
            onOpenScreen={handleOpenScreen}
            isLoggedIn={isLoggedIn}
            onRequireLogin={(screen) => {
              setPendingTargetScreen(screen);
              setIsLoginModalOpen(true);
            }}
            onLogout={handleLogout}
            authSession={authSession}
            pendingRentCount={pendingRentCount}
            pendingElectricityCount={pendingElecCount}
            acServiceDueCount={acServiceDue}
          />
        )}

        {/* Protected Screen Access Gate if accessed without admin credentials */}
        {ADMIN_PROTECTED_SCREENS.includes(activeScreen) && !isLoggedIn && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-md mx-auto text-center space-y-4 shadow-sm my-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Menu Khusus Pengelola
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Menu <strong>{getScreenTitle(activeScreen)}</strong> hanya dapat diakses oleh Pengelola / Admin Acarya Kost.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveScreen('home')}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Kembali ke Beranda
              </button>
              {authSession?.role !== 'tenant' && (
                <button
                  type="button"
                  onClick={() => {
                    setPendingTargetScreen(activeScreen);
                    setIsLoginModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                >
                  Login Admin
                </button>
              )}
            </div>
          </div>
        )}

        {activeScreen === 'sewa_kost' && (
          <RentPaymentModal
            currentTenant={currentTenant}
            settings={settings}
            onClose={() => setActiveScreen('home')}
            onSubmitPayment={handleSubmitRentPayment}
          />
        )}

        {activeScreen === 'listrik_kwh' && (
          <ElectricityPaymentModal
            currentTenant={currentTenant}
            settings={settings}
            onClose={() => setActiveScreen('home')}
            onSubmitElectricity={handleSubmitElectricityPayment}
          />
        )}

        {activeScreen === 'jadwal_fasilitas' && (
          <FacilityScheduleModal
            currentTenant={currentTenant}
            settings={settings}
            facilities={facilities}
            roomInspections={roomInspections}
            onClose={() => setActiveScreen('home')}
            onReportFacilityIssue={handleReportFacilityIssue}
          />
        )}

        {activeScreen === 'servis_ac' && (
          <AcServiceModal
            currentTenant={currentTenant}
            settings={settings}
            acServices={acServices}
            onClose={() => setActiveScreen('home')}
            onRequestAcService={handleRequestAcService}
          />
        )}

        {activeScreen === 'metode_bayar' && (
          <PaymentMethodsModal
            settings={settings}
            onClose={() => setActiveScreen('home')}
          />
        )}

        {activeScreen === 'pengingat_wa' && isLoggedIn && (
          <WhatsAppNotificationModal
            tenants={tenants}
            settings={settings}
            onClose={() => setActiveScreen('home')}
          />
        )}

        {activeScreen === 'riwayat_bayar' && (
          <PaymentHistoryModal
            currentTenant={currentTenant}
            kostPayments={kostPayments}
            electricityPayments={electricityPayments}
            isAdmin={isLoggedIn}
            onClose={() => setActiveScreen('home')}
            onVerifyPayment={handleVerifyPayment}
          />
        )}

        {activeScreen === 'admin_kost' && isLoggedIn && (
          <AdminDashboardModal
            tenants={tenants}
            settings={settings}
            kostPayments={kostPayments}
            electricityPayments={electricityPayments}
            onClose={() => setActiveScreen('home')}
            onVerifyPayment={handleVerifyPayment}
            onOpenGoogleSheetsModal={() => setActiveScreen('google_sheets')}
            onOpenWhatsAppModal={() => setActiveScreen('pengingat_wa')}
            onUpdateTenant={handleUpdateTenant}
          />
        )}

        {activeScreen === 'google_sheets' && isLoggedIn && (
          <GoogleSheetsSetupModal
            settings={settings}
            tenants={tenants}
            kostPayments={kostPayments}
            electricityPayments={electricityPayments}
            onUpdateSettings={handleUpdateSettings}
            onUpdateTenants={handleUpdateAllTenants}
            onClose={() => setActiveScreen('home')}
          />
        )}
      </main>

      {/* Footer */}
      <AppFooter
        settings={settings}
        currentTenant={currentTenant}
        authSession={authSession}
        onNavigateScreen={(screen) => handleOpenScreen(screen)}
        onLogout={handleLogout}
      />

      {/* Floating Bottom Quick Bar on mobile / modal view */}
      {activeScreen !== 'home' && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 max-w-xs mx-auto px-4 z-40">
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className="w-full py-2.5 sm:py-3 px-4 bg-slate-900/95 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg backdrop-blur-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700/80 active:scale-95"
          >
            <span>⌂ Kembali ke Menu Utama</span>
          </button>
        </div>
      )}

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingTargetScreen(null);
        }}
        onSuccessLogin={handleSuccessLogin}
        targetScreenTitle={getScreenTitle(pendingTargetScreen)}
      />
    </div>
  );
}
