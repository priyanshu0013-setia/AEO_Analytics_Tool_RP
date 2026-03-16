import * as esbuild from 'esbuild';
import { builtinModules } from 'module';

async function build() {
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node22', // Matching your Render Node version
    format: 'cjs',
    outfile: 'dist/index.cjs',
    external: [
      ...builtinModules,
      'pg',
      'express',
      'express',
      'cors',
      'cookie-parser',
      'drizzle-orm',
      '@workspace/db',
    ],
    sourcemap: true,
  });
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
