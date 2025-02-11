import mkcert from 'mkcert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateCertificates() {
  try {
    // Create CA
    const ca = await mkcert.createCA({
      organization: 'Virtual Study Room Dev CA',
      countryCode: 'US',
      state: 'Development',
      locality: 'Local',
      validityDays: 365
    });

    // Create certificate
    const cert = await mkcert.createCert({
      domains: ['127.0.0.1', 'localhost', '192.168.18.81'], // Add your IP address here
      validityDays: 365,
      caKey: ca.key,
      caCert: ca.cert
    });

    // Ensure .cert directory exists
    const certDir = path.join(__dirname, '..', '.cert');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir);
    }

    // Write certificates
    fs.writeFileSync(path.join(certDir, 'cert.pem'), cert.cert);
    fs.writeFileSync(path.join(certDir, 'key.pem'), cert.key);

    console.log('SSL certificates generated successfully!');
  } catch (error) {
    console.error('Error generating certificates:', error);
    process.exit(1);
  }
}

generateCertificates(); 