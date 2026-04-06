import { appsInToss } from '@apps-in-toss/framework/plugins';
import { env } from '@granite-js/plugin-env';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  appName: 'weathercheckin',
  scheme: 'intoss',
  entryFile: './src/_app.tsx',
  plugins: [
    router(),
    env({ KMA_API_KEY: process.env.KMA_API_KEY ?? '' }, { dts: false }),
    appsInToss({
      brand: {
        displayName: '날씨체크인',
        primaryColor: '#3B82F6',
        icon: 'https://static.toss.im/appsintoss/28423/0ac963f2-dd79-4f96-97a3-6930311898ff.png',
      },
      permissions: [],
      navigationBar: {
        withBackButton: true,
        withHomeButton: false,
      },
    }),
  ],
});
