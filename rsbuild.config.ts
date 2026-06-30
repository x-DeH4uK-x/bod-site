// @ts-check
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginTypedCSSModules } from '@rsbuild/plugin-typed-css-modules';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  html: {
    title: 'Maps: Blade of Darkness',
  },
  plugins: [
    pluginReact({
      reactCompiler: true,
    }),
    pluginSass(),
    pluginTypedCSSModules()
  ],
});
