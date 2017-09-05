#!/usr/bin/env node

const FS = require('fs');
const Junk = require('junk');
const Yargs = require('yargs');
const AWS = require('aws-sdk');
const Table = require('cli-table');
const defaultsDeep = require('lodash.defaultsdeep');

const api = new AWS.APIGateway();

const CurrentPath = process.cwd();
const ConfigPath = `${CurrentPath}/project.json`;
let GConfig;

function loadConfig(filePath = ConfigPath) {
  const exists = FS.existsSync(filePath);
  if (!exists) {
    throw new Error(`Can't find ${filePath}`);
  }
  return JSON.parse(FS.readFileSync(filePath, 'utf8'));
}

function loadMethod(name) {
  const tmp = {};
  const func = loadConfig(`${CurrentPath}/functions/${name}/function.json`);
  const template = GConfig['x-api-gateway']['swagger-func-template'];

  if (func && !func['x-api-gateway'] && !func['x-api-gateway'].method && !func['x-api-gateway'].path) {
    throw new Error(`${name} has some mistakes`);
  }
  const x = func['x-api-gateway'];
  const path = x.path;
  const method = x.method;

  tmp[path] = {};
  tmp[path][method] = defaultsDeep({
    summary: func.summary || name,
    description: func.description || '',
    'x-amazon-apigateway-integration': {
      httpMethod: 'post',
      uri: template['x-amazon-apigateway-integration'].uri.replace('{{functionName}}', `${GConfig.name}_${name}`),
    },
    parameters: x.parameters || [],
    security: x.security || [],
  }, template);

  Object.entries(GConfig['x-api-gateway'].paths).forEach(([key, value]) => {
    const keyPattern = new RegExp(`^${key}$`);
    if (keyPattern.test(path)) {
      defaultsDeep(tmp[path], value);
    }
  });
  return tmp;
}

function loadMethods() {
  const methods = {};
  FS.readdirSync(`${CurrentPath}/functions`).filter(Junk.not).forEach((folder) => {
    defaultsDeep(methods, loadMethod(folder));
  });
  return methods;
}

function loadSwagger() {
  return {
    swagger: '2.0',
    info: {
      version: (new Date()).toISOString(),
      title: GConfig.name,
    },
    basePath: GConfig['x-api-gateway'].base_path,
    schemes: [
      'https',
    ],
    'x-amazon-apigateway-request-validators': GConfig['x-api-gateway']['x-amazon-apigateway-request-validators'],
    'x-amazon-apigateway-request-validator': GConfig['x-api-gateway']['x-amazon-apigateway-request-validator'],
    paths: loadMethods(),
    securityDefinitions: GConfig['x-api-gateway'].securityDefinitions || {
      api_key: {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
    },
    definitions: GConfig['x-api-gateway'].definitions || {
      Empty: {
        type: 'object',
      },
    },
  };
}

function create({ name, description, clone, force }) {
  GConfig = loadConfig();
  if (!force && GConfig && GConfig['x-api-gateway'] && GConfig['x-api-gateway']['rest-api-id']) {
    throw new Error('RestAPI Id is already in the project.json files, if you want to override please use -f parameter');
  }

  api.createRestApi({ name, description, cloneFrom: clone }, (err, data) => {
    if (err) {
      throw err;
    }
    const updatedConfig = JSON.stringify(
      Object.assign({},
        GConfig, {
          'x-api-gateway': Object.assign({}, GConfig['x-api-gateway'], { 'rest-api-id': data.id }),
        }),
      null,
      2
    );

    FS.writeFile(ConfigPath, updatedConfig, (error) => {
      if (error) throw error;
      console.log('Create Success! Now you can push your RestAPI.');
    });
  });
}

function deploy({ stdout }) {
  GConfig = loadConfig();
  if (!GConfig['x-api-gateway'] || !GConfig['x-api-gateway']['rest-api-id']) {
    throw new Error('Missing RestAPI Id, you might want to use create command first.');
  }

  console.log('Loading Swagger...');
  const swagger = loadSwagger();

  if (stdout) {
    process.stdout.write(JSON.stringify(swagger, null, 2));
    return;
  }

  console.log('Pushing REST API...');
  api.putRestApi({
    body: JSON.stringify(swagger),
    restApiId: GConfig['x-api-gateway']['rest-api-id'],
    mode: 'overwrite',
  }, (err, data) => {
    if (err) {
      throw err;
    }

    console.log(data);
    console.log('Updated API with success!');

    console.log('Deploying REST API...');
    api.createDeployment({
      restApiId: GConfig['x-api-gateway']['rest-api-id'],
      stageName: GConfig['x-api-gateway'].stage_name,
    }, (error, data1) => {
      if (error) {
        throw error;
      }
      console.log(data1);
      console.log('API deployed successfully!');
    });
  });
}

function list() {
  GConfig = loadConfig();
  const table = new Table({
    head: ['Name', 'PATH', 'Description'],
    colWidths: [25, 35, 85],
  });
  console.log(loadMethods());

  // loadMethods().forEach((item) => {
  //   for (const [key, value] of item) {
  //     console.log(key + "'s phone number is: " + value);
  //   }
  // });

  console.log(table.toString());
}

return Yargs.usage('Usage: $0 <command> [options]')
  .command('create <name> [description]', 'Create a new RestAPI on AWS API Gateway', {
    clone: {
      alias: 'c',
      describe: 'The ID of the RestAPI that you want to clone from.',
      type: 'string',
    },
    force: {
      alias: 'f',
      describe: 'Force creating RestAPI. \n Overriding existing configuration.',
      type: 'boolean',
    },
  }, create)
  .command(
    'deploy',
    'Deploy RestAPI with the new Swagger definitions', {
      env: {
        alias: 'e',
        describe: 'Environment name',
        type: 'string',
      },
      stdout: {
        alias: 'o',
        describe: 'Output swagger',
        type: 'boolean',
      },
    },
    deploy)
  .command('list', 'List RestAPI', list)
  .help()
  .argv;
