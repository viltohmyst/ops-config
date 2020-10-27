/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { config as dotenv } from 'dotenv';
import convict, { Config } from 'convict';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

type GetReturnType<T> = ReturnType<Config<T>['get']>;
type GetParameterType<T> = Parameters<Config<T>['get']>;

type LogFunction = (...args: Array<any>) => void;

interface Logger {
  info: LogFunction;
  warn: LogFunction;
  debug: LogFunction;
  error: LogFunction;
}

interface PathPriority {
  config: Array<string>;
  dotenv: Array<string>;
}

export class OpsConfig {
  private static _instance: OpsConfig;

  private config: convict.Config<unknown> | undefined;

  // default logger is just the console
  private _log: Logger = console;

  private enableLog = false;

  private schema: string | convict.Schema<unknown> | undefined;

  private args: Array<string> | undefined;

  private envs: { [key: string]: string } | undefined;

  private pathPriority: PathPriority = { config: [], dotenv: [] };

  private constructor() {
    convict.addParser({ extension: ['yml', 'yaml'], parse: yaml.safeLoad });
  }

  private static get Instance() {
    // eslint-disable-next-line no-return-assign
    return this._instance || (this._instance = new this());
  }

  private static get log() {
    if (OpsConfig.Instance.enableLog) {
      return OpsConfig.Instance._log;
    } else {
      return {
        info: (...args: Array<any>): void => {},
        warn: (...args: Array<any>): void => {},
        debug: (...args: Array<any>): void => {},
        error: (...args: Array<any>): void => {},
      } as Logger;
    }
  }

  public static setLogger(logger: Logger): OpsConfig {
    OpsConfig.Instance._log = logger;
    OpsConfig.Instance.enableLog = true;
    return OpsConfig.Instance;
  }

  public static enableOpsConfigLogs(enable: boolean): OpsConfig {
    OpsConfig.Instance.enableLog = enable;
    return OpsConfig.Instance;
  }

  public static setSchema(schema: string | convict.Schema<unknown>): OpsConfig {
    OpsConfig.Instance.schema = schema;
    return OpsConfig.Instance;
  }

  public static setArgs(args: Array<string>): OpsConfig {
    OpsConfig.Instance.args = args;
    return OpsConfig.Instance;
  }

  public static setEnvs(envs: { [key: string]: string }): OpsConfig {
    OpsConfig.Instance.envs = envs;
    return OpsConfig.Instance;
  }

  public static init(): void | never {
    if (OpsConfig.Instance.schema) {
      OpsConfig.Instance.config = convict(OpsConfig.Instance.schema, {
        env: OpsConfig.Instance.envs,
        args: OpsConfig.Instance.args,
      });
      OpsConfig.log.debug(
        'Successfully initialized config with :',
        OpsConfig.Instance.schema,
        OpsConfig.Instance.envs,
        OpsConfig.Instance.args,
      );
    } else {
      const errorMessage =
        'setSchema(schema) must be called before invoking init()';
      OpsConfig.log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  public static setConfigPathPriorities();

  public static setDotenvPathPriorities();
  /*
paths.data
Directory for data files.

paths.config
Directory for config files.

paths.cache
Directory for non-essential data files.

paths.log
Directory for log files.

paths.temp
Directory for temporary files.
  */

  /*

  loadConfigFromFile
  // Perform validation
    this.config.validate({ allowed: 'strict' });

  loadDotenvFromFile

  set name, value

  save name or name, value
  */

  // app mode https://www.npmjs.com/package/config
  // https://github.com/lorenwest/node-config/wiki/Environment-Variables
  // cli mode

  public static get<T>(...args: GetParameterType<T>): GetReturnType<T> | never {
    if (OpsConfig.Instance.config) {
      return OpsConfig.Instance.config.get(...args);
    } else {
      const errorMessage =
        'setSchema(schema) and init() must first be called before using a get(key) method';
      OpsConfig.log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
