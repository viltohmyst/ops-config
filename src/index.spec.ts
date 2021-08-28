import { FileNotFoundError, OpsConfig } from './index';
import tempy from 'tempy';
import fs from 'fs';
import * as root from 'app-root-path';
import { PathPriorityBuilderSync } from 'path-priority';

describe('PathPriorityBuilder', () => {
  let directoryPath: string;
  let schemaPath: string;
  let configPath: string;
  let dotenvPath: string;
  let schema: any;
  beforeAll(() => {
    directoryPath = tempy.directory();
    fs.mkdirSync(directoryPath + '/test');
    schemaPath = directoryPath + '/test/schema.js';
    configPath = directoryPath + '/test/config.yaml';
    dotenvPath = directoryPath + '/test/.env';
    schema = require('../test/schema');
    fs.copyFileSync(root.path + '/test/config.yaml', configPath);
    fs.copyFileSync(root.path + '/test/schema.js', schemaPath);
    fs.copyFileSync(root.path + '/test/.env', dotenvPath);
  });

  afterAll(() => {
    fs.rmdirSync(directoryPath);
  });

  describe('log', () => {
    it('should use console by default if log is enabled', () => {
      const originalConsole = console;
      const infoMock = jest.fn();
      console.info = infoMock;
      const warnMock = jest.fn();
      console.warn = warnMock;
      const debugMock = jest.fn();
      console.debug = debugMock;
      const errorMock = jest.fn();
      console.error = errorMock;

      expect(() => {
        OpsConfig.get('noValue');
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(0);

      expect(() => {
        OpsConfig.init();
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(0);

      OpsConfig.enableLogs(true);

      expect(() => {
        OpsConfig.get('noValue');
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(1);

      expect(() => {
        OpsConfig.init();
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(2);

      OpsConfig.enableLogs(false);
      // eslint-disable-next-line no-global-assign
      console = originalConsole;
    });

    it('should use custom logger if set', () => {
      const customLogger: any = {};
      customLogger.info = jest.fn();
      customLogger.warn = jest.fn();
      customLogger.debug = jest.fn();
      customLogger.error = jest.fn();

      OpsConfig.setLogger(customLogger);

      expect(() => {
        OpsConfig.get('noValue');
      }).toThrow();
      expect(customLogger.error).toHaveBeenCalledTimes(1);

      expect(() => {
        OpsConfig.init();
      }).toThrow();
      expect(customLogger.error).toHaveBeenCalledTimes(2);

      OpsConfig.setSchema(schema).init();
      expect(customLogger.debug).toHaveBeenCalledTimes(1);

      OpsConfig.setLogger(console).enableLogs(false);
    });
  });

  describe('loadFromFile', () => {
    it('should successfully load file if exists', () => {
      OpsConfig.setSchema(schema).init();
      OpsConfig.loadFromFile(configPath);
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db').name).toEqual('users');
    });
    it('should merge with load JSON', () => {
      OpsConfig.setSchema(schema).init();
      OpsConfig.loadFromFile(configPath);
      OpsConfig.load({ merged: { nested: 'yes' } });
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db').name).toEqual('users');
      expect(OpsConfig.get('merged').nested).toEqual('yes');
    });
    it('should use env value before default', () => {
      process.env.PORT = '6060';
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath);
      expect(OpsConfig.get('port')).toEqual(6060);
    });
    it('should use new value if set', () => {
      process.env.PORT = '6060';
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath);
      OpsConfig.set('port', 5353);
      expect(OpsConfig.get('port')).toEqual(5353);
    });
    it('should use dotenv value before default and after env', () => {
      process.env.PORT = '6060';
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('db.host')).toEqual('dotenv');
      expect(OpsConfig.get('port')).toEqual(6060);
    });

    it('should use new env values if env args is set, priority is : envArgs > env > dotenv > fileValue > defaultValue', () => {
      process.env.PORT = '6060';
      OpsConfig.setEnvs({ PORT: '2020' });
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('port')).toEqual(2020);
      OpsConfig.clearEnvs();
      OpsConfig.init(schema, undefined, { PORT: '2020' });
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('port')).toEqual(2020);
      OpsConfig.clearEnvs();
    });

    it('should use new env values if env args is set, priority is : commandArgs > envArgs', () => {
      process.env.PORT = '6060';
      OpsConfig.setEnvs({ PORT: '2020' });
      OpsConfig.setArgs({ port: '1010' });
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('port')).toEqual(1010);
      OpsConfig.clearArgs().clearEnvs();
      OpsConfig.init(
        schema,
        { port: '1010', non: undefined },
        { PORT: '2020', non: undefined },
      );
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('port')).toEqual(1010);
      OpsConfig.clearArgs().clearEnvs();
    });

    it('should use correct types for args', () => {
      OpsConfig.setArgs({
        boolFalse: false,
        boolTrue: true,
        numberType: 6,
        stringType: 'string',
      });
      OpsConfig.init(schema);
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('stringType')).toEqual('string');
      expect(OpsConfig.get('numberType')).toEqual(6);
      expect(OpsConfig.get('boolFalse')).toEqual(false);
      expect(OpsConfig.get('boolTrue')).toEqual(true);
      OpsConfig.clearArgs().clearEnvs();
      OpsConfig.init(
        schema,
        { port: '1010', non: undefined },
        { PORT: '2020', non: undefined },
      );
      OpsConfig.loadFromFile(configPath, dotenvPath);
      expect(OpsConfig.get('port')).toEqual(1010);
      OpsConfig.clearArgs().clearEnvs();
    });
  });

  describe('loadFromPathPriority', () => {
    it('should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema);
      OpsConfig.loadFromPathPriority('test/config.yaml');
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db').name).toEqual('users');
      OpsConfig.loadFromPathPriority('test/config.yaml', 'test/.env');
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db.host')).toEqual('dotenv');
      OpsConfig.clearArgs().clearEnvs();
    });

    it('using server preset, should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema);
      OpsConfig.usePriorityPreset('server');
      OpsConfig.loadFromPathPriority('test/config.yaml');
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db').name).toEqual('users');
      OpsConfig.loadFromPathPriority('test/config.yaml', 'test/.env');
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db.host')).toEqual('dotenv');
      OpsConfig.clearArgs().clearEnvs();
    });

    it('using custom Path Priority, should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/config.yaml')
        .appRoot();
      const customDotenv = new PathPriorityBuilderSync()
        .findPaths('test/.env')
        .appRoot();
      OpsConfig.loadFromPathPriority(customPathPriority);
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db').name).toEqual('users');
      OpsConfig.loadFromPathPriority(customPathPriority, customDotenv);
      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('db.host')).toEqual('dotenv');
      OpsConfig.clearArgs().clearEnvs();
    });

    it('should throw error if config not found', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema, undefined, { PORT: '2020' });
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('testnot/config.yaml')
        .appRoot();

      expect(OpsConfig.get('port')).toEqual(2020);
      expect(OpsConfig.get('ip')).toEqual('127.0.0.1');

      try {
        OpsConfig.loadFromFile('testnot/config.yaml');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        OpsConfig.loadFromPathPriority(customPathPriority);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(OpsConfig.get('port')).toEqual(2020);
      expect(OpsConfig.get('ip')).toEqual('127.0.0.1');
      OpsConfig.clearArgs().clearEnvs();
    });

    it('should throw error if .env not found', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/config.yaml')
        .appRoot();
      const customDotenv = new PathPriorityBuilderSync()
        .findPaths('testnot/.env')
        .appRoot();

      try {
        OpsConfig.loadFromFile('test/config.yaml', 'testnot/.env');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        OpsConfig.loadFromPathPriority(customPathPriority, customDotenv);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      OpsConfig.clearArgs().clearEnvs();
    });

    it('should create config if not found and default content set', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/generatedpriority.yaml')
        .appRoot();
      OpsConfig.setDefaultFileContents('');

      try {
        OpsConfig.loadFromFile('test/generatedfile0.yaml');
      } catch (error) {
        expect(error).toBeDefined();
      }

      expect(OpsConfig.get('port')).toEqual(8080);
      expect(OpsConfig.get('ip')).toEqual('127.0.0.1');
      expect(OpsConfig.get('db.name')).toEqual('users');

      OpsConfig.setDefaultFileContents(
        'env: development\nip: 127.0.0.2\nport: 1234\ndb:\n  host: config1\n  name: users1',
      );

      try {
        OpsConfig.loadFromFile('test/generatedfile.yaml');
      } catch (error) {
        expect(error).toBeDefined();
      }
      expect(OpsConfig.get('ip')).toEqual('127.0.0.2');

      OpsConfig.setDefaultFileContents(
        'env: development\nip: 127.0.0.3\nport: 1234\ndb:\n  host: config1\n  name: users1',
      );
      try {
        OpsConfig.loadFromPathPriority(customPathPriority);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(OpsConfig.get('ip')).toEqual('127.0.0.3');
      expect(OpsConfig.get('db.name')).toEqual('users1');

      try {
        fs.accessSync(root.path + '/test/generatedfile0.yaml');
        fs.accessSync(root.path + '/test/generatedfile.yaml');
        fs.accessSync(root.path + '/test/generatedpriority.yaml');
      } catch (error) {
        expect(error).toBeUndefined();
      }

      fs.unlinkSync(root.path + '/test/generatedfile0.yaml');
      fs.unlinkSync(root.path + '/test/generatedfile.yaml');
      fs.unlinkSync(root.path + '/test/generatedpriority.yaml');
    });

    it('should throw error if default content set but path priority has not absolute and passing conditional', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      OpsConfig.init(schema, undefined, { PORT: '2020' });
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/generatedpriority.yaml')
        .findWithGlob();
      OpsConfig.setDefaultFileContents('');

      try {
        OpsConfig.loadFromPathPriority(customPathPriority);
      } catch (error) {
        expect(error).toBeInstanceOf(FileNotFoundError);
      }

      expect(OpsConfig.get('port')).toEqual(2020);
      expect(OpsConfig.get('ip')).toEqual('127.0.0.1');
    });
  });
});
