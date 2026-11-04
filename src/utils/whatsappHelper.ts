import { KostPaymentRecord, ElectricityRecord, TenantProfile, AppSettings } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function buildWaLink(phone: string, message: string): string {
  const target = cleanPhoneNumber(phone);
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`;
}

/**
 * 1. Pengingat Jatuh Tempo Sewa Kost Bulanan / Tahunan
 */
export function generateRentReminderMessage(
  tenant: TenantProfile,
  settings: AppSettings,
  customDueDate?: string,
  customPeriod?: string,
  customAmount?: number
): string {
  const amount = customAmount || tenant.monthlyRentRate;
  const dueDate = customDueDate || `Tanggal ${tenant.rentDueDateDay} bulan ini`;
  const period = customPeriod || 'Bulan Berjalan';
  const branchName = tenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';

  return `Halo kak *${tenant.name}* (${branchName} - Kamar *${tenant.roomNumber}*) 👋

Kami dari pengelola *${branchName}* ingin mengingatkan perihal pembayaran sewa kost:

🏠 *Tagihan Sewa Kost (${branchName})*
• Lokasi: *${branchName}*
• Kamar: ${tenant.roomNumber}
• Periode: ${period}
• Nominal: *${formatRupiah(amount)}*
• Batas Jatuh Tempo: *${dueDate}*

💳 *Pilihan Pembayaran:*
1. Transfer Bank BRI: *${settings.briAccountNo}* a.n ${settings.briAccountName}
2. Tunai (Cash) langsung ke Pengelola

Silakan lakukan pembayaran dan unggah bukti transfer melalui aplikasi KostPay ya kak. 
Apabila sudah melakukan pembayaran, mohon abaikan pesan ini. Terima kasih banyak! 🙏✨`;
}

/**
 * 2. Pengingat Jatuh Tempo Tagihan Listrik Pulsa (kWh Awal - Akhir + Biaya Mesin Rp 30.000)
 */
export function generateElectricityReminderMessage(
  tenant: TenantProfile,
  settings: AppSettings,
  meterData?: {
    period: string;
    initialKwh: number;
    finalKwh: number;
    usageKwh: number;
    kwhCost: number;
    machineFee: number;
    totalAmount: number;
    dueDate: string;
  }
): string {
  const branchName = tenant.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';

  if (meterData) {
    return `Halo kak *${tenant.name}* (${branchName} - Kamar *${tenant.roomNumber}*) 👋

Berikut kami sampaikan rincian tagihan listrik pulsa periode *${meterData.period}*:

⚡ *Rincian Penggunaan Listrik (${branchName}):*
• Lokasi: *${branchName}*
• Kamar: ${tenant.roomNumber}
• Stand Meter Awal: ${meterData.initialKwh} kWh
• Stand Meter Akhir: ${meterData.finalKwh} kWh
• Total Pemakaian: *${meterData.usageKwh} kWh* x Rp 2.000 = ${formatRupiah(meterData.kwhCost)}
• Biaya Listrik Mesin/Pompa: *${formatRupiah(meterData.machineFee)}*
────────────────────────────
💰 *TOTAL TAGIHAN: ${formatRupiah(meterData.totalAmount)}*
⏰ Batas Jatuh Tempo: *${meterData.dueDate}*

💳 *Metode Pembayaran:*
• Transfer BRI: *${settings.briAccountNo}* a.n ${settings.briAccountName}
• Tunai (Cash) langsung ke Pengelola

Bukti transfer dapat diupload di aplikasi KostPay. Terima kasih banyak kak! 🙏`;
  }

  // Generic reminder if meter not yet calculated
  return `Halo kak *${tenant.name}* (${branchName} - Kamar *${tenant.roomNumber}*) 👋

Pengingat untuk pencatatan dan pembayaran tagihan listrik pulsa *${branchName}* bulan ini (tarif Rp 2.000/kWh + Rp 30.000 listrik mesin).
Batas jatuh tempo tagihan listrik adalah tanggal *${tenant.electricityDueDateDay}* bulan ini.

Silakan masukkan angka stand meter awal & akhir bulan di aplikasi KostPay untuk menghitung otomatis total tagihan dan melakukan pembayaran.

Terima kasih atas kerjasamanya! 🙏`;
}

/**
 * 3. Notifikasi Pengiriman Pembayaran oleh Anak Kost ke Admin
 */
export function generateTenantSubmissionNotification(
  payment: KostPaymentRecord | ElectricityRecord,
  isElectricity: boolean,
  settings: AppSettings
): string {
  const branchName = payment.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : 'Acarya Kost 1';

  if (isElectricity) {
    const el = payment as ElectricityRecord;
    return `Halo Pengelola *${settings.kostName}* 👋
Saya *${el.tenantName}* (${branchName} - Kamar *${el.roomNumber}*) telah melakukan konfirmasi pembayaran listrik:

⚡ *Rincian Listrik:*
• Lokasi: *${branchName}*
• Kamar: ${el.roomNumber}
• Periode: ${el.periodMonth}
• Meter: ${el.initialKwh} kWh ➔ ${el.finalKwh} kWh (${el.usageKwh} kWh)
• Total Bayar: *${formatRupiah(el.totalAmount)}*
• Metode: *${el.paymentMethod.toUpperCase()}*
• ID: ${el.id}

Bukti pembayaran telah saya lampirkan di aplikasi KostPay. Mohon dicek dan diverifikasi. Terima kasih! 🙏`;
  }

  const kp = payment as KostPaymentRecord;
  return `Halo Pengelola *${settings.kostName}* 👋
Saya *${kp.tenantName}* (${branchName} - Kamar *${kp.roomNumber}*) telah melakukan konfirmasi pembayaran sewa kost:

🏠 *Rincian Sewa Kost:*
• Lokasi: *${branchName}*
• Kamar: ${kp.roomNumber}
• Tipe: ${kp.paymentType === 'tahunan' ? 'Tahunan (1 Tahun)' : kp.paymentType === 'beberapa_bulan' ? `${kp.durationMonths} Bulan` : 'Bulanan'}
• Periode: ${kp.periodStart} s/d ${kp.periodEnd}
• Total Bayar: *${formatRupiah(kp.totalAmount)}*
• Metode: *${kp.paymentMethod.toUpperCase()}*
• ID: ${kp.id}

Bukti pembayaran telah saya upload di aplikasi KostPay. Mohon dicek dan diverifikasi di Google Sheet. Terima kasih! 🙏`;
}
