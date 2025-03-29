import { 
  validateAddress, 
  hashData, 
  encodeData, 
  decodeData, 
  verifyDataIntegrity,
  DATA_FORMAT 
} from '@/services/DataVerificationService';

// Mock ethers library
jest.mock('ethers', () => {
  return {
    utils: {
      isAddress: jest.fn(address => {
        return /^0x[0-9a-fA-F]{40}$/.test(address);
      }),
      getAddress: jest.fn(address => {
        // Simple mock for checksum address
        return address.toLowerCase().replace(/(0x[0-9a-f]{2})/g, s => s.toUpperCase());
      }),
      toUtf8Bytes: jest.fn(text => {
        return new Uint8Array(Buffer.from(text));
      }),
      toUtf8String: jest.fn(bytes => {
        return Buffer.from(bytes).toString('utf8');
      }),
      hexlify: jest.fn(bytes => {
        if (typeof bytes === 'string') return bytes;
        return '0x' + Buffer.from(bytes).toString('hex');
      }),
      arrayify: jest.fn(hex => {
        // Remove 0x prefix
        const hexString = hex.startsWith('0x') ? hex.slice(2) : hex;
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
          bytes.push(parseInt(hexString.substr(i, 2), 16));
        }
        return new Uint8Array(bytes);
      }),
      hexValue: jest.fn(value => {
        return '0x' + value.toString(16);
      }),
      keccak256: jest.fn(value => {
        // Simple mock for keccak256
        if (typeof value === 'string') {
          return '0xkeccak256_' + value.replace(/0x/g, '');
        } else {
          return '0xkeccak256_bytes_' + Buffer.from(value).toString('hex');
        }
      }),
      sha256: jest.fn(value => {
        // Simple mock for sha256
        if (typeof value === 'string') {
          return '0xsha256_' + value.replace(/0x/g, '');
        } else {
          return '0xsha256_bytes_' + Buffer.from(value).toString('hex');
        }
      }),
      ripemd160: jest.fn(value => {
        // Simple mock for ripemd160
        if (typeof value === 'string') {
          return '0xripemd_' + value.replace(/0x/g, '');
        } else {
          return '0xripemd_bytes_' + Buffer.from(value).toString('hex');
        }
      }),
    },
    BigNumber: {
      from: jest.fn(value => {
        return {
          toNumber: () => Number(value),
          toString: () => String(value)
        };
      }),
    }
  };
});

// Mock BlockchainService
jest.mock('@/services/BlockchainService', () => ({
  isConnected: jest.fn().mockReturnValue(true),
  getSigner: jest.fn().mockResolvedValue({
    signMessage: jest.fn().mockResolvedValue('0xmocksignature'),
    _signTypedData: jest.fn().mockResolvedValue('0xmocktypeddatasignature')
  })
}));

describe('DataVerificationService', () => {
  describe('validateAddress', () => {
    it('should validate a correct Ethereum address', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const result = validateAddress(address);
      expect(result.valid).toBeTruthy();
      expect(result.checksumValid).toBeTruthy();
    });

    it('should identify an invalid Ethereum address', () => {
      const address = '0xinvalid';
      const result = validateAddress(address);
      expect(result.valid).toBeFalsy();
    });

    it('should handle empty address', () => {
      const result = validateAddress('');
      expect(result.valid).toBeFalsy();
      expect(result.error).toBe('Address is empty');
    });
  });

  describe('hashData', () => {
    it('should hash string data correctly', () => {
      const data = 'test data';
      const result = hashData(data);
      expect(result).toEqual(expect.stringContaining('0xkeccak256_'));
    });

    it('should hash hex data correctly', () => {
      const data = '0x1234';
      const result = hashData(data);
      expect(result).toEqual(expect.stringContaining('0xkeccak256_'));
    });

    it('should handle different algorithms', () => {
      const data = 'test data';
      const sha256Result = hashData(data, { algorithm: 'sha256' });
      const ripemdResult = hashData(data, { algorithm: 'ripemd160' });
      
      expect(sha256Result).toEqual(expect.stringContaining('0xsha256_'));
      expect(ripemdResult).toEqual(expect.stringContaining('0xripemd_'));
    });
  });

  describe('encodeData', () => {
    it('should encode string to hex', () => {
      const data = 'hello';
      const result = encodeData(data, DATA_FORMAT.HEX);
      expect(result).toEqual(expect.stringContaining('0x'));
    });

    it('should encode string to base64', () => {
      const data = 'hello';
      const result = encodeData(data, DATA_FORMAT.BASE64);
      expect(result).toBe('aGVsbG8=');
    });

    it('should handle encoding numbers to hex', () => {
      const data = 42;
      const result = encodeData(data, DATA_FORMAT.HEX);
      expect(result).toEqual('0x2a');
    });
  });

  describe('decodeData', () => {
    it('should decode hex to string', () => {
      const data = '0x68656c6c6f'; // 'hello' in hex
      const result = decodeData(data, DATA_FORMAT.HEX, DATA_FORMAT.UTF8);
      expect(result).toBe('hello');
    });

    it('should decode base64 to hex', () => {
      const data = 'aGVsbG8='; // 'hello' in base64
      const result = decodeData(data, DATA_FORMAT.BASE64, DATA_FORMAT.HEX);
      expect(result).toEqual(expect.stringContaining('0x'));
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data matches its hash', () => {
      const data = 'important data';
      const hash = hashData(data);
      const result = verifyDataIntegrity(data, hash);
      expect(result).toBeTruthy();
    });

    it('should detect data tampering', () => {
      const data = 'original data';
      const hash = hashData(data);
      const tamperedData = 'tampered data';
      const result = verifyDataIntegrity(tamperedData, hash);
      expect(result).toBeFalsy();
    });
  });
});
