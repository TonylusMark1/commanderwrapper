import * as TSUP from 'tsup';

//

export default TSUP.defineConfig({
    entry: ['src/index.ts'],
    outDir: "dist",
    format: ['esm'],
    sourcemap: true,
    clean: true,
    dts: true,
});