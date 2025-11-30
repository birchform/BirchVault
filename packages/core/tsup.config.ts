import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'crypto/index': 'src/crypto/index.ts',
    'types/index': 'src/types/index.ts',
    'totp/index': 'src/totp/index.ts',
    'webauthn/index': 'src/webauthn/index.ts',
    'sharing/index': 'src/sharing/index.ts',
    'subscription/index': 'src/subscription/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});

