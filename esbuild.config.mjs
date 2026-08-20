import esbuild from 'esbuild';

const prod = process.argv.includes('production');

esbuild.build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['es2020'],
  sourcemap: !prod,
  minify: prod,
  external: ['obsidian'],
}).catch(() => process.exit(1));
