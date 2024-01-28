const { createExtension, createNodeDescriptor } = require('@cognigy/extension-tools');
const { execSync } = require('child_process');

const pyPath = `${__dirname}/../bin/python`;

// We give python binary the jackpot, so it can be executed by anyone.
try {
  execSync(`chmod 777 ${pyPath}`);
} catch(e) {}

exports.default = createExtension({
  nodes: [

    createNodeDescriptor({

      type: "Execute Python",
      summary: 'Execute Python code. Output can be sent to user or stored in context/input as string or buffer.',
      fields: [
        {
          key: 'code',
          label: 'Code',
          description: 'The Python code. // @ts-nocheck will be stripped off before execution',
          type: 'typescript',
          defaultValue: '// @ts-nocheck\n\nprint("hello world!")',
          params: {
            required: true
          }
        },

        {
          key: 'outputLocation',
          label: 'Output location',
          description: 'If location is "say", then output is converted to string before being sent to endpoint.',
          type: 'select',
          defaultValue: 'say',
          params: {
            required: true,
            options: ['context', 'input', 'say'].map(t => ({
              label: t,
              value: t
            }))
          }
        },

        {
          key: 'stringify',
          label: 'Cast to String',
          description: 'Cast result to String or keep it as Buffer',
          type: 'toggle',
          defaultValue: true,
          params: {
            required: true,
          },
          condition: {
            or: [
              {
                key: 'outputLocation',
                value: 'context',
              },
              {
                key: 'outputLocation',
                value: 'input'
              }
            ]
          }
        },

        {
          key: 'locationPath',
          label: 'Location path',
          description: 'Location in context',
          type: 'cognigyText',
          defaultValue: 'python.result',
          params: {
            required: true
          },
          condition: {
            or: [
              {
                key: 'outputLocation',
                value: 'context',
              },
              {
                key: 'outputLocation',
                value: 'input'
              }
            ]
          }
        }
      ],

      function: async ({ config, cognigy }) => {
        const { code, outputLocation, locationPath, stringify } = config;
        const { api } = cognigy;

        api.log('debug', `executing ${pyPath}...`)

        /**
         * @type {Buffer}
         */
        const result = execSync(`${pyPath} -c "${
          
            code.replaceAll('// @ts-nocheck', '')
                .replaceAll(`"`, `\\"`)

        }"`);

        switch(outputLocation) {
          case "say": {
            return api.say(result.toString('utf8'));
          }

          case "input": {
            return api.addToInput(locationPath, stringify ? result.toString('utf8') : result);
          }

          case "context": {
            return api.addToContext(locationPath, stringify ? result.toString('utf8') : result, 'simple');
          }
        }

      }
    })

  ]
});
