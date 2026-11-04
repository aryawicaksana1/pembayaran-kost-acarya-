/**
 * Utility untuk kompresi foto/gambar bukti pembayaran sebelum disimpan & dikirim ke Google Sheets.
 * Mereduksi ukuran file dari 3-8 MB menjadi ~80-180 KB tanpa mengurangi keterbacaan teks bukti transfer / angka kWh meter.
 */

export async function compressImageFile(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Jika bukan file gambar, gunakan FileReader biasa
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback jika decode gambar gagal
        resolve((readerEvent.target?.result as string) || '');
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scaling proporsional
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve((readerEvent.target?.result as string) || '');
          return;
        }

        // Latar belakang putih untuk PNG transparan saat dikonversi ke JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke format JPEG terkompresi
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve((readerEvent.target?.result as string) || '');
        }
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
