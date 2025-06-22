export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  const { data, encoding = 'base64' } = req.body;

  if (!data) {
    return res.status(400).json({ error: 'No data provided' });
  }

  try {
    const buffer = Buffer.from(data, encoding);
    const size = buffer.length;

    const signatures = [
      { name: 'WAV',     hex: '52494646', offset: 0, second: '57415645', secondOffset: 8 },
      { name: 'MP3',     hex: '494433',   offset: 0 },
      { name: 'FLAC',    hex: '664C6143', offset: 0 },
      { name: 'OGG',     hex: '4F676753', offset: 0 },
      { name: 'PNG',     hex: '89504E47', offset: 0 },
      { name: 'JPEG',    hex: 'FFD8FF',   offset: 0 },
      { name: 'GIF',     hex: '47494638', offset: 0 }
    ];

    let format = 'unknown';

    for (const sig of signatures) {
      const slice = buffer.slice(sig.offset, sig.offset + sig.hex.length / 2);
      const hex = slice.toString('hex').toUpperCase();

      if (hex.startsWith(sig.hex.toUpperCase())) {
        if (sig.second) {
          const secondSlice = buffer.slice(sig.secondOffset, sig.secondOffset + sig.second.length / 2);
          const secondHex = secondSlice.toString('hex').toUpperCase();
          if (secondHex.startsWith(sig.second.toUpperCase())) {
            format = sig.name;
            break;
          }
        } else {
          format = sig.name;
          break;
        }
      }
    }

    // Определим printable символы
    const utfText = buffer.toString('utf8');
    const textSample = utfText.slice(0, 200);
    const printable = textSample.replace(/[^\x20-\x7E]/g, '').length;
    const nonPrintableRatio = 1 - (printable / (textSample.length || 1));

    const result = {
      size,
      encodingUsed: encoding,
      printableRatio: +(1 - nonPrintableRatio).toFixed(2),
      detectedFormat: format,
      firstBytesHex: buffer.slice(0, 16).toString('hex'),
      firstBytesBase64: buffer.slice(0, 16).toString('base64'),
    };

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to process data', details: e.message });
  }
}