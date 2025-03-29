import fs from 'fs';
import path from 'path';

export const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '../../ssl/certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../../ssl/certs/cert.pem')),
    minVersion: 'TLSv1.2',
    ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
    honorCipherOrder: true,
    secureOptions: ['SSL_OP_NO_SSLv3', 'SSL_OP_NO_TLSv1'].join(':'),
    allowHTTP1: true,
    keepAliveTimeout: 60000,
    headersTimeout: 65000,
    requestCert: false,
    maxVersion: 'TLSv1.3',
    enableTrace: process.env.NODE_ENV === 'development',
    handshakeTimeout: 10000
};
