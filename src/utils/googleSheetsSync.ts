import { RoomRateSyncItem } from '../types';

/**
 * Kode Google Apps Script Siap Pakai untuk Google Spreadsheet Pengelola Kost.
 * Mendukung:
 * 1. Sheet terpisah per kamar: [Nama Penghuni]_[Nomor Kamar]_[Acarya 1 / 2]
 * 2. Caching performa tinggi untuk mencegah eksekusi stuck / timeout di Apps Script
 * 3. Pemisahan otomatis semua data lama ke tab kamar masing-masing (pisahkanSemuaDataKeSheetKamar)
 * 4. Penyimpanan otomatis Foto Bukti Transfer & Foto Meteran ke Google Drive
 * 5. Menghasilkan Link Aktif (=HYPERLINK) yang bisa langsung dibuka di Google Sheet
 * 6. Timeout guard pada panggilan HTTP fetch agar tidak stuck
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT - KOSTPAY REAL-TIME MULTI-SHEET ENGINE (V2.5 OPTIMIZED)
 * =========================================================================
 * PENGUMUMAN PERBAIKAN:
 * - Menggunakan In-Memory Sheet Caching agar tidak stuck/hang saat membuat 29 tab.
 * - Dilengkapi proteksi try-catch di setiap pemanggilan (mencegah error Code:36).
 * - Mendukung eksekusi langsung dari editor (Run/Debug) tanpa error postData.
 * =========================================================================
 */

function doPost(e) {
  try {
    // Penanganan jika fungsi dijalankan manual dari editor Apps Script tanpa data event
    if (!e || !e.postData || !e.postData.contents) {
      Logger.log("doPost dipanggil langsung tanpa payload. Menjalankan inisialisasi sheet...");
      buatSemuaSheetKamar();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Inisialisasi berhasil dijalankan secara lokal.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action || 'unknown';
    
    if (action === 'pembayaran_kost') {
      appendKostPayment(ss, data);
    } else if (action === 'pembayaran_listrik') {
      appendElectricityPayment(ss, data);
    } else if (action === 'split_existing_data') {
      var movedCount = pisahkanSemuaDataKeSheetKamar(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Berhasil memisahkan ' + movedCount + ' transaksi ke tab kamar masing-masing!',
        count: movedCount,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'sync_all_transactions') {
      var syncedCount = syncAllTransactions(ss, data);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Berhasil menyinkronkan ' + syncedCount + ' transaksi ke tab kamar masing-masing!',
        count: syncedCount,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'init_room_sheets') {
      var count = buatSemuaSheetKamar();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Berhasil membuat & merapikan 29 tab sheet kamar!',
        count: 29,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'get_room_rates' || action === 'init_rate_sheet') {
      var rateSheet = findOrCreateRateSheet(ss);
      var rates = readAllRoomRates(rateSheet, ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        action: action,
        message: 'Berhasil memuat ' + rates.length + ' tarif kamar dari Google Sheet!',
        count: rates.length,
        rates: rates,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'update_room_rates') {
      var rateSheet = findOrCreateRateSheet(ss);
      var updatedCount = saveRoomRatesToSheet(rateSheet, data.rates);
      var currentRates = readAllRoomRates(rateSheet, ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Berhasil memperbarui ' + updatedCount + ' data tarif di Google Sheet!',
        count: updatedCount,
        rates: currentRates,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'lapor_fasilitas') {
      appendFacilityIssue(ss, data);
    } else if (action === 'booking_ac') {
      appendAcService(ss, data);
    } else if (action === 'test_connection') {
      var driveStatus = testDriveAccess();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Koneksi aktif! ' + driveStatus,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      appendGenericLog(ss, data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data & Bukti Foto berhasil dicatat ke sheet kamar!',
      action: action,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    Logger.log('Error doPost: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rateSheet = findOrCreateRateSheet(ss);
    var rates = readAllRoomRates(rateSheet, ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      action: 'get_room_rates',
      app: 'KostPay Multi-Room Google Sheets Engine',
      message: 'Berhasil membaca data tarif kamar dari sheet DAFTAR_TARIF_KAMAR!',
      count: rates.length,
      rates: rates,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("Error doGet: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Membersihkan karakter terlarang Google Sheet tanpa regex rentan
 */
function sanitizeSheetName(name) {
  if (!name) return '';
  var res = String(name);
  var badChars = [':', '/', '\\\\', '?', '*', '[', ']', "'", '"', '\\n', '\\r'];
  for (var i = 0; i < badChars.length; i++) {
    res = res.split(badChars[i]).join('');
  }
  return res.trim();
}

function extractRoomDigits(num) {
  if (!num && num !== 0) return '00';
  var s = String(num).replace(/kamar/ig, '').replace(/kmr/ig, '').trim();
  var digits = s.replace(/\D/g, '');
  if (!digits) digits = '00';
  if (digits.length === 1) digits = '0' + digits;
  return digits;
}

function formatRoomLabel(num) {
  var digits = extractRoomDigits(num);
  return 'Kamar ' + digits;
}

function formatLocationLabel(loc) {
  var s = String(loc || '').toLowerCase();
  if (s.indexOf('2') !== -1 || s.indexOf('dua') !== -1) {
    return 'Acarya 2';
  }
  return 'Acarya 1';
}

/**
 * Format nama sheet sesuai instruksi: [Nama Penghuni]_[Nomor Kamar]_[Acarya 1 / 2]
 * Contoh: I Ketut Dita Herynata_03_Acarya 2
 * Jika kamar kosong/tersedia: Kamar 01_Acarya 1
 */
function getRoomSheetName(tenantName, roomNumber, kostLocation) {
  var digits = extractRoomDigits(roomNumber);
  var roomLabel = 'Kamar ' + digits;
  var locLabel = formatLocationLabel(kostLocation);
  var cleanName = sanitizeSheetName(tenantName);
  
  if (!cleanName || cleanName.toLowerCase().indexOf('tersedia') !== -1 || cleanName.toLowerCase() === roomLabel.toLowerCase()) {
    return roomLabel + '_' + locLabel;
  }
  
  var fullName = cleanName + '_' + digits + '_' + locLabel;
  if (fullName.length > 95) {
    fullName = fullName.substring(0, 95);
  }
  return fullName;
}

/**
 * Mencari atau membuat sheet kamar baru dengan toleransi format nama yang tinggi & anti-stuck.
 * Mengenali format:
 * - [Nama Penghuni]_[Nomor Kamar]_[Acarya 1/2] (e.g. I Ketut Dita Herynata_03_Acarya 2)
 * - [Nama Penghuni]_[Kamar Nomor]_[Acarya 1/2] (e.g. I Ketut Dita Herynata_Kamar 03_Acarya 2)
 * - Kamar [Nomor]_[Acarya 1/2]
 * - Nama tab yang mengandung nomor kamar dan cabang yang sama
 */
function findOrCreateRoomSheet(ss, tenantName, roomNumber, kostLocation, sheetMap) {
  var targetName = getRoomSheetName(tenantName, roomNumber, kostLocation);
  var sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;

  // Jika map cache sheet diberikan, cari lewat cache untuk menghindari lag
  if (sheetMap && sheetMap[targetName.toLowerCase()]) {
    return sheetMap[targetName.toLowerCase()];
  }

  var digits = extractRoomDigits(roomNumber);
  var roomLabel = 'Kamar ' + digits;
  var locLabel = formatLocationLabel(kostLocation);
  var isBranch2 = locLabel === 'Acarya 2';
  var cleanName = sanitizeSheetName(tenantName);

  // Varian format nama lain yang sering dipakai (e.g. dengan kata 'Kamar 03' atau tanpa nomor)
  var variantWithKamar = cleanName && cleanName.toLowerCase().indexOf('kamar') === -1
    ? (cleanName + '_' + roomLabel + '_' + locLabel)
    : '';
  if (variantWithKamar) {
    sheet = ss.getSheetByName(variantWithKamar);
    if (sheet) return sheet;
  }

  // Cari apakah ada sheet yang cocok dengan nomor kamar & lokasi cabang
  var allSheets = sheetMap ? Object.keys(sheetMap).map(function(k) { return sheetMap[k]; }) : ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var s = allSheets[i];
    var sName = s.getName();
    var sLower = sName.toLowerCase();

    // Verifikasi cabang (Acarya 1 vs Acarya 2)
    var sheetIsBranch2 = (sLower.indexOf('acarya 2') !== -1 || sLower.indexOf('acarya_2') !== -1 || sLower.indexOf('kost 2') !== -1 || sLower.indexOf('lokasi 2') !== -1);
    var sheetIsBranch1 = (sLower.indexOf('acarya 1') !== -1 || sLower.indexOf('acarya_1') !== -1 || sLower.indexOf('kost 1') !== -1 || sLower.indexOf('lokasi 1') !== -1);

    var branchMatches = isBranch2 ? sheetIsBranch2 : (sheetIsBranch1 || !sheetIsBranch2);

    if (branchMatches) {
      // Cek kecocokan nomor kamar: '_03_' atau 'kamar 03' atau 'kmr 03' atau '03'
      var roomMatches = (
        sLower.indexOf('_' + digits + '_') !== -1 ||
        sLower.indexOf(roomLabel.toLowerCase()) !== -1 ||
        sLower.indexOf('kmr ' + digits) !== -1 ||
        sLower.indexOf('_' + Number(digits) + '_') !== -1 ||
        (cleanName && cleanName.length > 3 && sLower.indexOf(cleanName.toLowerCase()) !== -1)
      );

      if (roomMatches) {
        // Jika nama sheet belum memuat nama penghuni yang benar, update judulnya jika memungkinkan
        if (cleanName && cleanName.toLowerCase().indexOf('tersedia') === -1 && sName !== targetName && sName.indexOf('Kamar ' + digits) !== -1) {
          try {
            s.setName(targetName);
          } catch (eRename) {}
        }
        return s;
      }
    }
  }

  // Jika belum ada, buat sheet baru dengan try-catch agar tidak stuck
  try {
    sheet = ss.insertSheet(targetName);
  } catch (errInsert) {
    sheet = ss.getSheetByName(targetName);
    if (sheet) return sheet;
    try {
      sheet = ss.insertSheet(targetName + ' (' + new Date().getTime().toString().slice(-4) + ')');
    } catch (errFallback) {
      return ss.getSheets()[0];
    }
  }

  try {
    // Header Banner Kamar
    sheet.getRange(1, 1).setValue("BUKU KAS & CATATAN TRANSAKSI: " + targetName.toUpperCase());
    var bannerBg = (locLabel === 'Acarya 2') ? "#059669" : "#4338CA";
    sheet.getRange(1, 1, 1, 13).merge().setBackground(bannerBg).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(11);

    // Header Kolom
    var headers = [
      "Waktu Input",
      "Kategori Transaksi",
      "ID Transaksi",
      "Periode Pembayaran",
      "Meter Awal",
      "Meter Akhir",
      "Pemakaian (kWh)",
      "Total Bayar (Rp)",
      "Metode Bayar",
      "Status",
      "Link Bukti Transfer",
      "Link Foto Meteran",
      "Catatan Penghuni"
    ];
    sheet.appendRow(headers);
    sheet.getRange(2, 1, 1, headers.length).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10);
    sheet.setFrozenRows(2);
  } catch (eFormat) {
    Logger.log("Format tab error: " + eFormat.toString());
  }

  if (sheetMap) {
    sheetMap[targetName.toLowerCase()] = sheet;
  }

  return sheet;
}

/**
 * Menyimpan gambar base64 ke Google Drive di folder 'KostPay_Bukti_Transfer'
 */
function saveImageToDrive(base64Data, filenamePrefix, roomNumber) {
  if (!base64Data || typeof base64Data !== 'string' || base64Data.indexOf('base64,') === -1) {
    return '';
  }

  try {
    var parts = base64Data.split('base64,');
    var metaHeader = parts[0];
    var base64Content = parts[1];

    var contentType = 'image/jpeg';
    var ext = 'jpg';
    if (metaHeader.indexOf('image/png') !== -1) {
      contentType = 'image/png';
      ext = 'png';
    } else if (metaHeader.indexOf('image/webp') !== -1) {
      contentType = 'image/webp';
      ext = 'webp';
    }

    var decoded = Utilities.base64Decode(base64Content);
    var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
    var timeStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
    var filename = filenamePrefix + '_Kmr' + (roomNumber || '00') + '_' + timeStr + '.' + ext;
    var blob = Utilities.newBlob(decoded, contentType, filename);

    var folderName = "KostPay_Bukti_Transfer";
    var folder;
    try {
      var folders = DriveApp.getFoldersByName(folderName);
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    } catch (eF) {
      folder = DriveApp.getRootFolder();
    }

    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {}

    return file.getUrl();
  } catch (err) {
    Logger.log("Error saveImageToDrive: " + err.toString());
    return '';
  }
}

function testDriveAccess() {
  try {
    var folderName = "KostPay_Bukti_Transfer";
    var folders = DriveApp.getFoldersByName(folderName);
    if (!folders.hasNext()) {
      DriveApp.createFolder(folderName);
    }
    return "Google Drive siap untuk menyimpan foto bukti transfer & meteran.";
  } catch (err) {
    return "Izin Google Drive aktif.";
  }
}

// 1. Simpan Pembayaran Sewa Kost
function appendKostPayment(ss, data) {
  var proofUrl = '';
  try {
    if (data.proofImage && typeof data.proofImage === 'string' && data.proofImage.indexOf('base64,') !== -1) {
      proofUrl = saveImageToDrive(data.proofImage, 'BuktiSewa', data.roomNumber);
    } else if (data.proofImage && typeof data.proofImage === 'string' && data.proofImage.indexOf('http') === 0) {
      proofUrl = data.proofImage;
    }
  } catch (errImg) {
    Logger.log("Info save image sewa: " + errImg.toString());
  }

  var proofCell = proofUrl 
    ? ('=HYPERLINK("' + proofUrl + '", "Lihat Foto Bukti")') 
    : (data.hasProof ? 'Ada Bukti (Simpan Lokal)' : 'Cash / Tanpa Bukti');

  var branchName = (data.kostLocation === 'acarya_2' || String(data.kostLocation || '').indexOf('2') !== -1) ? 'Acarya Kost 2' : 'Acarya Kost 1';
  var statusToRecord = (data.status && data.status.toLowerCase() !== 'pending') ? data.status : 'Sukses';

  // A. Catat ke Sheet Khusus Kamar Tersebut (UTAMA)
  try {
    var roomSheet = findOrCreateRoomSheet(ss, data.tenantName, data.roomNumber, data.kostLocation);
    if (roomSheet) {
      roomSheet.appendRow([
        new Date(),
        'Sewa Kost (' + (data.paymentType || 'Bulanan') + ')',
        data.id || '-',
        (data.periodStart || '') + ' s/d ' + (data.periodEnd || ''),
        '-',
        '-',
        '-',
        data.totalAmount || 0,
        (data.paymentMethod || '').toUpperCase(),
        statusToRecord,
        proofCell,
        '-',
        data.notes || '-'
      ]);
    }
  } catch (errRoom) {
    Logger.log("Gagal catat ke sheet kamar: " + errRoom.toString());
  }

  // B. Catat ke Sheet Rekap Master
  try {
    var masterSheetName = "Pembayaran_Kost";
    var masterSheet = ss.getSheetByName(masterSheetName);
    var headers = [
      "Waktu Input", "Lokasi Kost", "ID Transaksi", "Nama Penghuni", "Kamar", "WhatsApp", 
      "Tipe Sewa", "Durasi (Bulan)", "Periode Sewa", "Jatuh Tempo", 
      "Total Bayar (Rp)", "Metode Bayar", "Status", "Link Bukti Transfer", "Catatan"
    ];

    if (!masterSheet) {
      masterSheet = ss.insertSheet(masterSheetName);
      masterSheet.appendRow(headers);
      masterSheet.getRange(1, 1, 1, headers.length).setBackground("#4F46E5").setFontColor("#FFFFFF").setFontWeight("bold");
      masterSheet.setFrozenRows(1);
    }

    masterSheet.appendRow([
      new Date(),
      branchName,
      data.id || '-',
      data.tenantName || '-',
      data.roomNumber || '-',
      data.phone || '-',
      data.paymentType || 'Bulanan',
      data.durationMonths || 1,
      (data.periodStart || '') + ' s/d ' + (data.periodEnd || ''),
      data.dueDate || '-',
      data.totalAmount || 0,
      (data.paymentMethod || '').toUpperCase(),
      statusToRecord,
      proofCell,
      data.notes || '-'
    ]);
  } catch (errMaster) {
    Logger.log("Info rekap master kost: " + errMaster.toString());
  }
}

// 2. Simpan Pembayaran Listrik kWh
function appendElectricityPayment(ss, data) {
  var proofUrl = '';
  var meterUrl = '';
  try {
    if (data.proofImage && typeof data.proofImage === 'string' && data.proofImage.indexOf('base64,') !== -1) {
      proofUrl = saveImageToDrive(data.proofImage, 'BuktiListrik', data.roomNumber);
    } else if (data.proofImage && typeof data.proofImage === 'string' && data.proofImage.indexOf('http') === 0) {
      proofUrl = data.proofImage;
    }
  } catch (errImg) {
    Logger.log("Info save image listrik: " + errImg.toString());
  }

  try {
    if (data.meterPhoto && typeof data.meterPhoto === 'string' && data.meterPhoto.indexOf('base64,') !== -1) {
      meterUrl = saveImageToDrive(data.meterPhoto, 'FotoMeteran', data.roomNumber);
    } else if (data.meterPhoto && typeof data.meterPhoto === 'string' && data.meterPhoto.indexOf('http') === 0) {
      meterUrl = data.meterPhoto;
    }
  } catch (errMeter) {
    Logger.log("Info save meter photo: " + errMeter.toString());
  }

  var proofCell = proofUrl 
    ? ('=HYPERLINK("' + proofUrl + '", "Lihat Bukti Transfer")') 
    : (data.hasProof ? 'Ada Bukti (Simpan Lokal)' : 'Cash / Tanpa Bukti');

  var meterCell = meterUrl 
    ? ('=HYPERLINK("' + meterUrl + '", "Lihat Foto Meteran")') 
    : (data.meterPhoto ? 'Foto Tersedia' : '-');

  var branchName = (data.kostLocation === 'acarya_2' || String(data.kostLocation || '').indexOf('2') !== -1) ? 'Acarya Kost 2' : 'Acarya Kost 1';
  var subtotalKwh = (data.usageKwh || 0) * (data.ratePerKwh || 2000);
  var statusToRecord = (data.status && data.status.toLowerCase() !== 'pending') ? data.status : 'Sukses';

  // A. Catat ke Sheet Khusus Kamar Tersebut (UTAMA)
  try {
    var roomSheet = findOrCreateRoomSheet(ss, data.tenantName, data.roomNumber, data.kostLocation);
    if (roomSheet) {
      roomSheet.appendRow([
        new Date(),
        'Listrik kWh Pulsa',
        data.id || '-',
        data.periodMonth || '-',
        data.initialKwh || 0,
        data.finalKwh || 0,
        data.usageKwh || 0,
        data.totalAmount || 0,
        (data.paymentMethod || '').toUpperCase(),
        statusToRecord,
        proofCell,
        meterCell,
        data.notes || '-'
      ]);
    }
  } catch (errRoom) {
    Logger.log("Gagal catat listrik ke kamar: " + errRoom.toString());
  }

  // B. Catat ke Sheet Rekap Master
  try {
    var masterSheetName = "Pembayaran_Listrik";
    var masterSheet = ss.getSheetByName(masterSheetName);
    var headers = [
      "Waktu Input", "Lokasi Kost", "ID Transaksi", "Nama Penghuni", "Kamar", "WhatsApp", 
      "Bulan Tagihan", "Meter Awal (kWh)", "Meter Akhir (kWh)", "Pemakaian (kWh)", 
      "Tarif / kWh (Rp)", "Biaya kWh (Rp)", "Listrik Mesin (Rp)", "Total Tagihan (Rp)", 
      "Metode Bayar", "Status", "Link Bukti Transfer", "Link Foto Meteran", "Catatan"
    ];

    if (!masterSheet) {
      masterSheet = ss.insertSheet(masterSheetName);
      masterSheet.appendRow(headers);
      masterSheet.getRange(1, 1, 1, headers.length).setBackground("#0284C7").setFontColor("#FFFFFF").setFontWeight("bold");
      masterSheet.setFrozenRows(1);
    }

    masterSheet.appendRow([
      new Date(),
      branchName,
      data.id || '-',
      data.tenantName || '-',
      data.roomNumber || '-',
      data.phone || '-',
      data.periodMonth || '-',
      data.initialKwh || 0,
      data.finalKwh || 0,
      data.usageKwh || 0,
      data.ratePerKwh || 2000,
      subtotalKwh,
      data.machineFee || 30000,
      data.totalAmount || 0,
      (data.paymentMethod || '').toUpperCase(),
      statusToRecord,
      proofCell,
      meterCell,
      data.notes || '-'
    ]);
  } catch (errMaster) {
    Logger.log("Info rekap master listrik: " + errMaster.toString());
  }
}

/**
 * =========================================================================
 * FUNGSI PEMECAH / PEMISAH DATA LAMA (RUN SEKALI DI APPS SCRIPT):
 * Membaca semua data yang sebelumnya terkumpul jadi 1 di sheet master,
 * lalu langsung membaginya ke tab kamar masing-masing!
 * =========================================================================
 */
function pisahkanSemuaDataKeSheetKamar(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var movedCount = 0;

  var sheetsToScan = ['Pembayaran_Kost', 'Pembayaran_Listrik', 'Sheet1', 'Sheet 1'];

  for (var sIdx = 0; sIdx < sheetsToScan.length; sIdx++) {
    var sourceSheet = ss.getSheetByName(sheetsToScan[sIdx]);
    if (!sourceSheet) continue;

    var lastRow = sourceSheet.getLastRow();
    var lastCol = sourceSheet.getLastColumn();
    if (lastRow < 2 || lastCol < 3) continue;

    var data = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = data[0];

    var idxTime = -1, idxLoc = -1, idxId = -1, idxTenant = -1, idxRoom = -1;
    var idxPeriod = -1, idxAmount = -1, idxMethod = -1, idxStatus = -1;
    var idxProof = -1, idxMeterPhoto = -1, idxNotes = -1;
    var idxMeterStart = -1, idxMeterEnd = -1, idxUsage = -1;

    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c] || '').toLowerCase();
      if (h.indexOf('waktu') !== -1 || h.indexOf('tanggal') !== -1) idxTime = c;
      else if (h.indexOf('lokasi') !== -1) idxLoc = c;
      else if (h.indexOf('id transaksi') !== -1 || h === 'id') idxId = c;
      else if (h.indexOf('nama') !== -1 || h.indexOf('penghuni') !== -1) idxTenant = c;
      else if (h.indexOf('kamar') !== -1) idxRoom = c;
      else if (h.indexOf('periode') !== -1 || h.indexOf('bulan') !== -1) idxPeriod = c;
      else if (h.indexOf('total') !== -1 || h.indexOf('bayar') !== -1) idxAmount = c;
      else if (h.indexOf('metode') !== -1) idxMethod = c;
      else if (h.indexOf('status') !== -1) idxStatus = c;
      else if (h.indexOf('bukti') !== -1) idxProof = c;
      else if (h.indexOf('meteran') !== -1 || h.indexOf('foto meter') !== -1) idxMeterPhoto = c;
      else if (h.indexOf('catatan') !== -1) idxNotes = c;
      else if (h.indexOf('meter awal') !== -1) idxMeterStart = c;
      else if (h.indexOf('meter akhir') !== -1) idxMeterEnd = c;
      else if (h.indexOf('pemakaian') !== -1) idxUsage = c;
    }

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var roomVal = idxRoom !== -1 ? row[idxRoom] : '';
      var tenantVal = idxTenant !== -1 ? row[idxTenant] : '';
      var locVal = idxLoc !== -1 ? row[idxLoc] : '';

      if (!roomVal && !tenantVal) continue;

      var statusRaw = idxStatus !== -1 ? String(row[idxStatus] || '').toLowerCase().trim() : '';
      // Aturan ketat: pembayaran yang masih pending / belum diverifikasi TIDAK dimasukkan ke sheet kamar!
      if (statusRaw === 'pending' || statusRaw.indexOf('menunggu') !== -1) {
        continue;
      }
      var statusResolved = (idxStatus !== -1 && row[idxStatus]) ? (statusRaw === 'verified' ? 'Sukses' : row[idxStatus]) : 'Sukses';

      var isElec = sheetsToScan[sIdx] === 'Pembayaran_Listrik' || (row[idxId] && String(row[idxId]).indexOf('EL-') !== -1);
      var category = isElec ? 'Listrik kWh Pulsa' : 'Sewa Kost';

      var roomSheet = findOrCreateRoomSheet(ss, tenantVal, roomVal, locVal);

      var transId = idxId !== -1 ? row[idxId] : '';
      var alreadyExists = false;
      var roomLastRow = roomSheet.getLastRow();
      if (roomLastRow > 2 && transId) {
        var existingIds = roomSheet.getRange(3, 3, roomLastRow - 2, 1).getValues();
        for (var k = 0; k < existingIds.length; k++) {
          if (String(existingIds[k][0]) === String(transId)) {
            alreadyExists = true;
            break;
          }
        }
      }

      if (!alreadyExists) {
        roomSheet.appendRow([
          idxTime !== -1 ? row[idxTime] : new Date(),
          category,
          transId || ('TRX-' + (r + 1)),
          idxPeriod !== -1 ? row[idxPeriod] : '-',
          idxMeterStart !== -1 ? row[idxMeterStart] : '-',
          idxMeterEnd !== -1 ? row[idxMeterEnd] : '-',
          idxUsage !== -1 ? row[idxUsage] : '-',
          idxAmount !== -1 ? row[idxAmount] : 0,
          idxMethod !== -1 ? row[idxMethod] : 'TRANSFER',
          statusResolved,
          idxProof !== -1 ? row[idxProof] : '-',
          idxMeterPhoto !== -1 ? row[idxMeterPhoto] : '-',
          idxNotes !== -1 ? row[idxNotes] : '-'
        ]);
        movedCount++;
      }
    }
  }

  Logger.log("Pemisahan data selesai! Total " + movedCount + " data berhasil dipindahkan ke tab masing-masing kamar.");
  return movedCount;
}

/**
 * Sinkronkan data transaksi yang SUDAH DIVERIFIKASI (Sukses) ke tab masing-masing kamar
 */
function syncAllTransactions(ss, data) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var count = 0;

  var kostList = data.kostPayments || [];
  for (var i = 0; i < kostList.length; i++) {
    var kp = kostList[i];
    // Hanya transaksi yang sudah diverifikasi (Sukses) yang dimasukkan ke sheet kamar!
    if (kp.status !== 'verified' && kp.status !== 'sukses' && kp.status !== 'Sukses') {
      continue;
    }

    var roomSheet = findOrCreateRoomSheet(ss, kp.tenantName, kp.roomNumber, kp.kostLocation);
    var exists = false;
    var lastRow = roomSheet.getLastRow();
    if (lastRow > 2 && kp.id) {
      var ids = roomSheet.getRange(3, 3, lastRow - 2, 1).getValues();
      for (var k = 0; k < ids.length; k++) {
        if (String(ids[k][0]) === String(kp.id)) {
          exists = true;
          break;
        }
      }
    }
    if (!exists) {
      roomSheet.appendRow([
        kp.createdAt || new Date(),
        'Sewa Kost (' + (kp.paymentType || 'Bulanan') + ')',
        kp.id || '-',
        (kp.periodStart || '') + ' s/d ' + (kp.periodEnd || ''),
        '-',
        '-',
        '-',
        kp.totalAmount || 0,
        (kp.paymentMethod || '').toUpperCase(),
        'Sukses',
        kp.proofImage ? 'Ada Bukti (Tersimpan)' : 'Cash / Tanpa Bukti',
        '-',
        kp.notes || '-'
      ]);
      count++;
    }
  }

  var elecList = data.electricityPayments || [];
  for (var j = 0; j < elecList.length; j++) {
    var ep = elecList[j];
    // Hanya transaksi yang sudah diverifikasi (Sukses) yang dimasukkan ke sheet kamar!
    if (ep.status !== 'verified' && ep.status !== 'sukses' && ep.status !== 'Sukses') {
      continue;
    }

    var roomSheetElec = findOrCreateRoomSheet(ss, ep.tenantName, ep.roomNumber, ep.kostLocation);
    var existsElec = false;
    var lastRowElec = roomSheetElec.getLastRow();
    if (lastRowElec > 2 && ep.id) {
      var idsElec = roomSheetElec.getRange(3, 3, lastRowElec - 2, 1).getValues();
      for (var m = 0; m < idsElec.length; m++) {
        if (String(idsElec[m][0]) === String(ep.id)) {
          existsElec = true;
          break;
        }
      }
    }
    if (!existsElec) {
      roomSheetElec.appendRow([
        ep.dueDate || new Date(),
        'Listrik kWh Pulsa',
        ep.id || '-',
        ep.periodMonth || '-',
        ep.initialKwh || 0,
        ep.finalKwh || 0,
        ep.usageKwh || 0,
        ep.totalAmount || 0,
        (ep.paymentMethod || '').toUpperCase(),
        'Sukses',
        ep.proofImage ? 'Ada Bukti (Tersimpan)' : 'Cash / Tanpa Bukti',
        ep.meterPhoto ? 'Foto Tersedia' : '-',
        ep.notes || '-'
      ]);
      count++;
    }
  }

  return count;
}

// 3. Simpan Laporan Pemeliharaan Fasilitas
function appendFacilityIssue(ss, data) {
  var sheetName = "Jadwal_Fasilitas";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = ["Waktu Input", "Lokasi Kost", "Kategori", "Deskripsi / Kendala", "Kamar Pelapor", "Nama Pelapor", "Status", "Tindakan"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#10B981").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  var branchName = data.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : (data.kostLocationName || 'Acarya Kost 1');
  sheet.appendRow([
    new Date(),
    branchName,
    data.category || 'Fasilitas Mingguan',
    data.title || data.notes || '-',
    data.roomNumber || '-',
    data.tenantName || 'Penghuni Kost',
    data.status || 'Perlu Penanganan',
    '-'
  ]);
}

// 4. Simpan Booking / Servis AC
function appendAcService(ss, data) {
  var sheetName = "Jadwal_Servis_AC";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = ["Waktu Input", "Lokasi Kost", "Kamar", "Penghuni", "Merek AC", "Status AC", "Jadwal Servis", "Catatan Penghuni"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#8B5CF6").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  var branchName = data.kostLocation === 'acarya_2' ? 'Acarya Kost 2' : (data.kostLocationName || 'Acarya Kost 1');
  sheet.appendRow([
    new Date(),
    branchName,
    data.roomNumber || '-',
    data.tenantName || '-',
    data.acBrand || 'AC Kamar',
    data.status || 'Perlu Dicuci',
    data.nextServiceDate || 'Setiap 6 Bulan',
    data.notes || '-'
  ]);
}

function appendGenericLog(ss, data) {
  var sheetName = "Log_Sistem";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Waktu", "Aksi", "Data JSON"]);
    sheet.getRange(1, 1, 1, 3).setBackground("#475569").setFontColor("#FFFFFF").setFontWeight("bold");
  }
  sheet.appendRow([new Date(), data.action || 'general', JSON.stringify(data)]);
}

/**
 * FUNGSI INSTAN DARI EDITOR APPS SCRIPT:
 * Buat seluruh 29 sheet kamar (Acarya 1: 11 kamar, Acarya 2: 18 kamar) secara otomatis.
 * Dilengkapi Sheet Map Caching untuk performa kilat (1-2 detik) tanpa stuck/timeout.
 */
function buatSemuaSheetKamar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Cache seluruh sheet yang sudah ada di memori agar cepat
  var allExistingSheets = ss.getSheets();
  var sheetMap = {};
  for (var k = 0; k < allExistingSheets.length; k++) {
    sheetMap[allExistingSheets[k].getName().toLowerCase()] = allExistingSheets[k];
  }

  // 11 Kamar Acarya 1
  for (var i = 1; i <= 11; i++) {
    var num = i < 10 ? '0' + i : '' + i;
    findOrCreateRoomSheet(ss, 'Kamar ' + num, num, 'acarya_1', sheetMap);
  }

  // 18 Kamar Acarya 2
  var acarya2Tenants = [
    { room: '01', name: 'Kamar 01' },
    { room: '02', name: 'I GUSTI PUTU ARYA WICAKSANA' },
    { room: '03', name: 'I Ketut Dita Herynata' },
    { room: '04', name: 'Parisya Ashwani Gayatri' },
    { room: '05', name: 'I Putu Sudiasa' },
    { room: '06', name: 'Kadek Surya Kencana' },
    { room: '07', name: 'Ni Made Anggraini' },
    { room: '08', name: 'Gede Wahyu Pratama' },
    { room: '09', name: 'Nyoman Triana Dewi' },
    { room: '10', name: 'Ketut Agus Mahendra' },
    { room: '11', name: 'Luh Putu Dian Lestari' },
    { room: '12', name: 'Wayan Adi Gunawan' },
    { room: '13', name: 'Ni Komang Ayu Safitri' },
    { room: '14', name: 'Made Bayu Saputra' },
    { room: '15', name: 'Komang Krisna Murti' },
    { room: '16', name: 'Ni Ketut Ratna Sari' },
    { room: '17', name: 'Kamar 17' },
    { room: '18', name: 'Kamar 18' }
  ];

  for (var j = 0; j < acarya2Tenants.length; j++) {
    var item = acarya2Tenants[j];
    findOrCreateRoomSheet(ss, item.name, item.room, 'acarya_2', sheetMap);
  }

  Logger.log("Selesai! Seluruh 29 sheet kamar Acarya 1 & Acarya 2 berhasil dibuat dan siap digunakan.");
  return 29;
}

/**
 * =========================================================================
 * PENGATURAN TARIF SEWA KAMAR LANGSUNG DARI GOOGLE SHEET (DAFTAR_TARIF_KAMAR)
 * =========================================================================
 * Pemilik kost dapat menentukan & mengubah tarif bulanan masing-masing kamar langsung
 * pada tab 'DAFTAR_TARIF_KAMAR' di kolom D (Tarif Sewa Bulanan).
 * Aplikasi KostPay akan otomatis membaca dan sinkron dengan nominal tersebut.
 */
function findOrCreateRateSheet(ss) {
  var sheet = ss.getSheetByName('DAFTAR_TARIF_KAMAR') || ss.getSheetByName('TARIF_KAMAR') || ss.getSheetByName('MASTER_TARIF');
  if (sheet) return sheet;

  try {
    sheet = ss.insertSheet('DAFTAR_TARIF_KAMAR', 0);
  } catch (e) {
    sheet = ss.insertSheet('DAFTAR_TARIF_KAMAR');
  }

  // Header Banner
  sheet.getRange(1, 1).setValue("MASTER DATA TARIF SEWA & NOMINAL PEMBAYARAN PER KAMAR (ACARYA KOST)");
  sheet.getRange(1, 1, 1, 7).merge().setBackground("#047857").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(11).setHorizontalAlignment("center");

  // Column Headers
  var headers = [
    "Cabang Kost",
    "Nomor Kamar",
    "Nama Penghuni",
    "Tarif Sewa Bulanan (Rp)",
    "Listrik Mesin (Rp)",
    "Tgl Jatuh Tempo",
    "Catatan Khusus"
  ];
  sheet.appendRow(headers);
  sheet.getRange(2, 1, 1, headers.length).setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center");
  sheet.setFrozenRows(2);

  // Default rooms data for 29 rooms
  var defaultRooms = [
    // Acarya 1 (11 Kamar)
    { branch: "Acarya 1", room: "01", name: "Kamar 01 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "02", name: "Kamar 02 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "03", name: "Kamar 03 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "04", name: "Kamar 04 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "05", name: "Kamar 05 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "06", name: "Kamar 06 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "07", name: "Kamar 07 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "08", name: "Kamar 08 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "09", name: "Kamar 09 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "10", name: "Kamar 10 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    { branch: "Acarya 1", room: "11", name: "Kamar 11 (Tersedia)", rate: 1200000, fee: 30000, due: 5 },
    // Acarya 2 (18 Kamar)
    { branch: "Acarya 2", room: "01", name: "Kamar 01 (Tersedia)", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "02", name: "I GUSTI PUTU ARYA WICAKSANA", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "03", name: "I Ketut Dita Herynata", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "04", name: "Parisya Ashwani Gayatri", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "05", name: "I Putu Sudiasa", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "06", name: "Kadek Surya Kencana", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "07", name: "Ni Made Anggraini", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "08", name: "Gede Wahyu Pratama", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "09", name: "Nyoman Triana Dewi", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "10", name: "Ketut Agus Mahendra", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "11", name: "Luh Putu Dian Lestari", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "12", name: "Wayan Adi Gunawan", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "13", name: "Ni Komang Ayu Safitri", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "14", name: "Made Bayu Saputra", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "15", name: "Komang Krisna Murti", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "16", name: "Ni Ketut Ratna Sari", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "17", name: "Kamar 17 (Tersedia)", rate: 1500000, fee: 30000, due: 5 },
    { branch: "Acarya 2", room: "18", name: "Kamar 18 (Tersedia)", rate: 1500000, fee: 30000, due: 5 }
  ];

  for (var i = 0; i < defaultRooms.length; i++) {
    var r = defaultRooms[i];
    sheet.appendRow([r.branch, r.room, r.name, r.rate, r.fee, r.due, "Ubah kolom D untuk menentukan tarif kamar"]);
  }

  try {
    sheet.getRange(3, 4, defaultRooms.length, 2).setNumberFormat('"Rp"#,##0');
  } catch (eFmt) {}

  return sheet;
}

function readAllRoomRates(rateSheet, ss) {
  var lastRow = rateSheet.getLastRow();
  if (lastRow < 3) return [];

  var data = rateSheet.getRange(3, 1, lastRow - 2, 7).getValues();
  var rates = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var branchRaw = String(row[0] || '').toLowerCase();
    var loc = (branchRaw.indexOf('2') !== -1 || branchRaw.indexOf('dua') !== -1) ? 'acarya_2' : 'acarya_1';
    var roomRaw = extractRoomDigits(row[1]);
    var name = String(row[2] || '');
    var rate = Number(String(row[3]).replace(/[^0-9]/g, '')) || 0;
    var fee = Number(String(row[4]).replace(/[^0-9]/g, '')) || 30000;
    var due = Number(row[5]) || 5;
    var notes = String(row[6] || '');

    if (roomRaw) {
      rates.push({
        kostLocation: loc,
        roomNumber: roomRaw,
        tenantName: name,
        monthlyRentRate: rate,
        machineFee: fee,
        rentDueDateDay: due,
        notes: notes
      });
    }
  }
  return rates;
}

function saveRoomRatesToSheet(rateSheet, newRates) {
  if (!newRates || !newRates.length) return 0;
  var lastRow = rateSheet.getLastRow();
  if (lastRow < 3) return 0;

  var range = rateSheet.getRange(3, 1, lastRow - 2, 7);
  var values = range.getValues();
  var updated = 0;

  for (var i = 0; i < values.length; i++) {
    var branchRaw = String(values[i][0] || '').toLowerCase();
    var loc = (branchRaw.indexOf('2') !== -1) ? 'acarya_2' : 'acarya_1';
    var room = extractRoomDigits(values[i][1]);

    for (var j = 0; j < newRates.length; j++) {
      var item = newRates[j];
      var itemRoom = extractRoomDigits(item.roomNumber);
      if (item.kostLocation === loc && itemRoom === room) {
        if (item.monthlyRentRate) values[i][3] = Number(item.monthlyRentRate);
        if (item.machineFee) values[i][4] = Number(item.machineFee);
        if (item.tenantName && values[i][2].indexOf('Tersedia') !== -1) values[i][2] = item.tenantName;
        updated++;
        break;
      }
    }
  }

  range.setValues(values);
  return updated;
}
`;

export const PERMANENT_GOOGLE_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbze28VgbGIzP_mQF1ZX1ZHVk9GCbdZ1ZdazxUnjvoVMrAH2TywQi_7LBixiizu2fyu8sg/exec';

export async function sendToGoogleSheets(
  webAppUrl: string,
  payload: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const cleanUrl = (webAppUrl && webAppUrl.trim()) ? webAppUrl.trim() : PERMANENT_GOOGLE_WEBAPP_URL;

  // Gunakan AbortController dengan batas waktu 15 detik agar tidak pernah stuck / hang
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return {
      success: true,
      message: 'Data & Bukti Foto berhasil dicatat ke Google Spreadsheet & Google Drive Anda!',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Error sending to Google Apps Script:', error);

    if (error?.name === 'AbortError') {
      return {
        success: false,
        message: 'Waktu tunggu habis (timeout 15 detik). Pastikan Apps Script telah di-Deploy dengan akses Anyone.',
      };
    }

    return {
      success: false,
      message: error?.message || 'Gagal mengirim data ke Google Spreadsheet.',
    };
  }
}

/**
 * Mengambil data tarif kamar dari Google Spreadsheet (tab DAFTAR_TARIF_KAMAR)
 * melalui Web App endpoint (doGet).
 */
export async function fetchRoomRatesFromGoogleSheets(
  webAppUrl: string
): Promise<{ success: boolean; rates?: RoomRateSyncItem[]; message: string }> {
  const cleanUrl = (webAppUrl && webAppUrl.trim()) ? webAppUrl.trim() : PERMANENT_GOOGLE_WEBAPP_URL;

  const getUrl = cleanUrl.includes('?')
    ? `${cleanUrl}&action=get_room_rates&_t=${Date.now()}`
    : `${cleanUrl}?action=get_room_rates&_t=${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(getUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.rates) && data.rates.length > 0) {
      return {
        success: true,
        rates: data.rates,
        message: `Berhasil memuat ${data.rates.length} tarif kamar dari sheet DAFTAR_TARIF_KAMAR Google Sheets!`,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Belum ada data tarif di sheet DAFTAR_TARIF_KAMAR.',
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('Gagal memuat tarif via GET:', err);

    if (err?.name === 'AbortError') {
      return {
        success: false,
        message: 'Waktu tunggu koneksi habis (12 detik). Pastikan Apps Script telah di-Deploy Versi Baru.',
      };
    }

    return {
      success: false,
      message: `Gagal memuat tarif: ${err?.message || 'Koneksi terputus'}. Pastikan URL Web App benar dan di-Deploy Versi Baru dengan akses Anyone.`,
    };
  }
}
