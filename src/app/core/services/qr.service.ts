import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {
  async dataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      margin: 1,
      width: 320,
      color: { dark: '#f4e4c1', light: '#0c0714' },
      errorCorrectionLevel: 'M',
    });
  }
}
