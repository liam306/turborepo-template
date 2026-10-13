const nodeExternals = require('webpack-node-externals');
const swaggerPlugin = require('@nestjs/swagger/plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@repo/],
      }),
    ],
    module: {
      ...options.module,
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
                configFile: 'tsconfig.json',
                getCustomTransformers: (program) => ({
                  before: [
                    swaggerPlugin.before(
                      {
                        dtoFileNameSuffix: ['.dto.ts', '.entity.ts'],
                        classValidatorShim: true,
                        introspectComments: true,
                      },
                      program,
                    ),
                  ],
                }),
              },
            },
          ],
          exclude: /node_modules\/(?!@repo)/,
        },
      ],
    },
  };
};
