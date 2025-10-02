import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SignatureTestService {

  // Simulate your Java main method
  public async testSignature(): Promise<void> {
    // Example data
    const data = "producteur=Koto RANDRIA;date_expiration=11-09-2025;";
    // Replace these with your actual PEM and signature from Java
    const publicKeyPem =  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA+b7MwtaFPOymIFXhtWB56BUh+BJQdajBr6JYmXsYQuqwil3R6MXhquKX72tvYuzsCuo5aCprgOK4DlHhzbf4DVFmmqdhFkTyv+Uc6ba5o/KL5oWsznGKNR+0t9dHrTWMUIbcBgtz+HG7uIubrU16QCupZ6fDxY8WXMiF2HCD0X8lZUDl3hjsvoSR/TkLc9Z2NcjPDJmru6tNv50xdnklQ5dxbS0YnhhzoAApnOdceU/kYcxQrkjns85G1NNme0BOfdllcQII3M0/yHlhyKo62y7fTh5TYIev2/uJaXhPFK/OwXsDDi85RK81QWNUekd/YWxShPWgRq5mKayic7wjywIDAQAB
-----END PUBLIC KEY-----`;
    const signatureBase64 = "XbB2idel3NaSoLUkvnbaeAi2aYUrWaUwqrLTWaXxZLm/Ap1B9A/9LUqEMgv9Rk33Qg1MlOjGVKOf/hOpsbcOmD1/+PX1ndCOTF64M3ZzqnCuM7Ne00uzNSmTagoti5im9NG7l6BPg8NZh4IVKZtLtmT31pE6z8Dyi4Ymph670b5ZVBEeAHf6zpWX+5xIVEh43It+wfIJbEnkqYqZ3/G8pTt2YTVHF334kuwLCnfz6trEn7/ilie0H4Rmbuq7lAjLWirdU+C2trlPhAyh+EcuqEIFOzQ2L/9JB+gMouI61YTJDf/nAho/cMl009/c8fy+tWdJQCrneRIYHaCXWighIQ==";

    const isValid = await this.verifySignature(data, publicKeyPem, signatureBase64);
    console.log("Is signature valid FROM Component?", isValid);
  }

  // Verifies a signature using WebCrypto
  public verifySignature(data: string, publicKeyPem: string, signatureBase64: string): Promise<boolean> {
    function pemToArrayBuffer(pem: string): ArrayBuffer {
      const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
      const binary = atob(b64);
      const buffer = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
      return buffer.buffer;
    }

    const keyBuffer = pemToArrayBuffer(publicKeyPem);

    return window.crypto.subtle.importKey(
      'spki',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    ).then(publicKey => {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

      return window.crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        publicKey,
        signatureBuffer,
        dataBuffer
      );
    });
  }
}