import { GoodConfig } from './index';
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
        GoodConfig.get('noValue');
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(0);

      expect(() => {
        GoodConfig.init();
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(0);

      GoodConfig.enableLogs(true);

      expect(() => {
        GoodConfig.get('noValue');
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(1);

      expect(() => {
        GoodConfig.init();
      }).toThrow();
      expect(errorMock).toHaveBeenCalledTimes(2);

      GoodConfig.enableLogs(false);
      // eslint-disable-next-line no-global-assign
      console = originalConsole;
    });

    it('should use custom logger if set', () => {
      const customLogger: any = {};
      customLogger.info = jest.fn();
      customLogger.warn = jest.fn();
      customLogger.debug = jest.fn();
      customLogger.error = jest.fn();

      GoodConfig.setLogger(customLogger);

      expect(() => {
        GoodConfig.get('noValue');
      }).toThrow();
      expect(customLogger.error).toHaveBeenCalledTimes(1);

      expect(() => {
        GoodConfig.init();
      }).toThrow();
      expect(customLogger.error).toHaveBeenCalledTimes(2);

      GoodConfig.setSchema(schema).init();
      expect(customLogger.debug).toHaveBeenCalledTimes(1);

      GoodConfig.setLogger(console).enableLogs(false);
    });
  });

  describe('loadFromFile', () => {
    it('should successfully load file if exists', () => {
      GoodConfig.setSchema(schema).init();
      GoodConfig.loadFromFile(configPath);
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db').name).toEqual('users');
    });
    it('should use env value before default', () => {
      process.env.PORT = '6060';
      GoodConfig.init(schema);
      GoodConfig.loadFromFile(configPath);
      expect(GoodConfig.get('port')).toEqual(6060);
    });
    it('should use dotenv value before default and after env', () => {
      process.env.PORT = '6060';
      GoodConfig.init(schema);
      GoodConfig.loadFromFile(configPath, dotenvPath);
      expect(GoodConfig.get('db.host')).toEqual('dotenv');
      expect(GoodConfig.get('port')).toEqual(6060);
    });

    it('should use new env values if env args is set, priority is : envArgs > env > dotenv > fileValue > defaultValue', () => {
      process.env.PORT = '6060';
      GoodConfig.setEnvs({ PORT: '2020' });
      GoodConfig.init(schema);
      GoodConfig.loadFromFile(configPath, dotenvPath);
      expect(GoodConfig.get('port')).toEqual(2020);
      GoodConfig.clearEnvs();
    });

    it('should use new env values if env args is set, priority is : commandArgs > envArgs', () => {
      process.env.PORT = '6060';
      GoodConfig.setEnvs({ PORT: '2020' });
      GoodConfig.setArgs({ port: '1010' });
      GoodConfig.init(schema);
      GoodConfig.loadFromFile(configPath, dotenvPath);
      expect(GoodConfig.get('port')).toEqual(1010);
      GoodConfig.clearArgs().clearEnvs();
    });
  });

  describe('loadFromPathPriority', () => {
    it('should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      GoodConfig.init(schema);
      GoodConfig.loadFromPathPriority('test/config.yaml');
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db').name).toEqual('users');
      GoodConfig.loadFromPathPriority('test/config.yaml', 'test/.env');
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db.host')).toEqual('dotenv');
    });

    it('using server preset, should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      GoodConfig.init(schema);
      GoodConfig.usePriorityPreset('server');
      GoodConfig.loadFromPathPriority('test/config.yaml');
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db').name).toEqual('users');
      GoodConfig.loadFromPathPriority('test/config.yaml', 'test/.env');
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db.host')).toEqual('dotenv');
    });

    it('using custom Path Priority, should successfully load file if exists', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      GoodConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/config.yaml')
        .appRoot();
      const customDotenv = new PathPriorityBuilderSync()
        .findPaths('test/.env')
        .appRoot();
      GoodConfig.loadFromPathPriority(customPathPriority);
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db').name).toEqual('users');
      GoodConfig.loadFromPathPriority(customPathPriority, customDotenv);
      expect(GoodConfig.get('port')).toEqual(8080);
      expect(GoodConfig.get('db.host')).toEqual('dotenv');
    });

    it('should throw error if config not found', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      GoodConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('testnot/config.yaml')
        .appRoot();

      try {
        GoodConfig.loadFromFile('testnot/config.yaml');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        GoodConfig.loadFromPathPriority(customPathPriority);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should throw error if .env not found', () => {
      process.env.PORT = '8080';
      process.env.NODE_ENV = 'development';
      GoodConfig.init(schema);
      const customPathPriority = new PathPriorityBuilderSync()
        .findPaths('test/config.yaml')
        .appRoot();
      const customDotenv = new PathPriorityBuilderSync()
        .findPaths('testnot/.env')
        .appRoot();

      try {
        GoodConfig.loadFromFile('test/config.yaml', 'testnot/.env');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        GoodConfig.loadFromPathPriority(customPathPriority, customDotenv);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
