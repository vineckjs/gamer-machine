import { QRCodeSVG } from 'qrcode.react';

interface QrCodeModalProps {
  qrCodeText: string;
  amountCents: number;
  onClose: () => void;
}

export function QrCodeModal({ qrCodeText, amountCents, onClose }: QrCodeModalProps) {
  const amount = (amountCents / 100).toFixed(2).replace('.', ',');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center max-w-sm w-full mx-4">
        <h3 className="text-xl font-bold text-neon-green mb-2">PIX R$ {amount}</h3>
        <p className="text-gray-400 text-sm mb-6">Escaneie o QR Code com seu app do banco</p>

        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={qrCodeText} size={200} />
        </div>

        <div className="mt-4 w-full">
          <p className="text-xs text-gray-500 break-all text-center">{qrCodeText.slice(0, 60)}...</p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
