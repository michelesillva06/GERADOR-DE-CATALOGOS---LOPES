import QRCode from 'qrcode';

export async function generateQRCodeDataUrl(text: string, color: string = '#F10F4D'): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 300,
      color: {
        dark: color,
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}
