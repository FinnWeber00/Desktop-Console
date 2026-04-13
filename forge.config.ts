import type { ForgeConfig } from '@electron-forge/shared-types';
import path from 'node:path';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const keepInPackage = [
  '/.vite',
  '/assets',
  '/node_modules',
  '/node_modules/better-sqlite3',
  '/node_modules/bindings',
  '/node_modules/file-uri-to-path',
];

const shouldIgnorePackageFile = (file: string): boolean => {
  if (!file) {
    return false;
  }

  const normalized = file.replace(/\\\\/g, '/');
  return !keepInPackage.some((prefix) => normalized === prefix || normalized.startsWith(prefix + '/'));
};

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'assets', 'app-icon'),
    electronZipDir: path.resolve(__dirname, '.cache/electron-zips'),
    ignore: shouldIgnorePackageFile,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: path.resolve(__dirname, 'assets', 'app-icon.ico'),
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
