/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-ignore
const { build } = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const { peerDependencies } = require('./package.json');

const entryFile = 'src/index.ts';
const outBase = 'dist';
const shared = {
  bundle: true,
  entryPoints: [entryFile],
  loader: { '.js': 'jsx' },
  // Treat all dependencies in package.json as externals to keep bundle size to a minimum
  external: Object.keys(peerDependencies),
  logLevel: 'info',
  minify: false,
  sourcemap: false,
  plugins: [sassPlugin()],
};

build({
  ...shared,
  format: 'esm',
  outfile: `${outBase}/index.mjs`,
  target: ['esnext', 'node20.6.0'],
});

build({
  ...shared,
  format: 'cjs',
  outfile: `${outBase}/index.js`,
  target: ['esnext', 'node20.6.0'],
});
