/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/ban-types */
import { config as dotenv } from 'dotenv';
import convict, { Config } from 'convict';
import yaml from 'js-yaml';
import { PathPriorityBuilderSync } from 'path-priority';
import 'path-priority/lib/cjs/presets';
import fs from 'fs';
import { constants } from 'fs';
import convict_format_with_validator from 'convict-format-with-validator';
import convict_format_with_moment from 'convict-format-with-moment';

type GetReturnType<T> = ReturnType<Config<T>['get']>;
type GetParameterType<T> = Parameters<Config<T>['get']>;

type LogFunction = (...args: Array<any>) => void;

interface Logger {
  info: LogFunction;
  warn: LogFunction;
  debug: LogFunction;
  error: LogFunction;
}

type PathPriorityPreset = 'cli' | 'server';

export class OpsConfig {
  private static _instance: OpsConfig;

  private config: convict.Config<unknown> | undefined;

  // default logger is just the console
  private _log: Logger = console;

  private enableLog = false;

  private schema: string | convict.Schema<unknown> | undefined;

  private args: Array<string> | undefined;

  private envs: { [key: string]: string } | undefined;

  private preset: PathPriorityPreset = 'cli';

  private configPathPriority: PathPriorityBuilderSync;

  private dotenvPathPriority: PathPriorityBuilderSync;

  private constructor() {
    convict.addParser({ extension: ['yml', 'yaml'], parse: yaml.safeLoad });
    convict.addFormats(convict_format_with_validator);
    convict.addFormats(convict_format_with_moment);

    this.configPathPriority = new PathPriorityBuilderSync();
    this.dotenvPathPriority = new PathPriorityBuilderSync();
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

  public static setLogger(logger: Logger) {
    OpsConfig.Instance._log = logger;
    OpsConfig.Instance.enableLog = true;
    return this;
  }

  public static enableLogs(enable: boolean) {
    OpsConfig.Instance.enableLog = enable;
    return this;
  }

  public static setSchema(schema: string | convict.Schema<unknown>) {
    OpsConfig.Instance.schema = schema;
    return this;
  }

  public static setArgs(args: { [key: string]: string | undefined }) {
    const argsKeys = Object.keys(args);
    const formattedArgs: Array<string> = [];
    argsKeys.forEach((key) => {
      if (args[key]) {
        formattedArgs.push(`--${key}`, args[key] as string);
      }
    });
    OpsConfig.Instance.args = formattedArgs;
    return this;
  }

  public static clearArgs() {
    delete OpsConfig.Instance.args;
    return this;
  }

  public static setEnvs(envs: { [key: string]: string | undefined }) {
    const newObject = Object.keys(envs).reduce((acc: any, key) => {
      const _acc = acc;
      if (envs[key] !== undefined) _acc[key] = envs[key];
      return _acc;
    }, {});
    OpsConfig.Instance.envs = newObject;
    return this;
  }

  public static clearEnvs() {
    delete OpsConfig.Instance.envs;
    return this;
  }

  public static init(
    schema?: string | convict.Schema<unknown>,
    args?: { [key: string]: string | undefined },
    envs?: { [key: string]: string | undefined },
  ): void | never {
    OpsConfig.Instance.schema = schema || OpsConfig.Instance.schema;
    args !== undefined ? OpsConfig.setArgs(args) : null;
    envs !== undefined ? OpsConfig.setEnvs(envs) : null;
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

  public static loadFromFile(configPath: string, dotenvPath?: string) {
    if (!OpsConfig.Instance.config) {
      throw new Error('init() must be called before loadFromFile');
    }

    if (dotenvPath) {
      const result = dotenv({ path: dotenvPath });
      if (result.error) {
        throw result.error;
      }
      OpsConfig.Instance.config = convict(
        OpsConfig.Instance.schema as string | convict.Schema<unknown>,
        {
          env: OpsConfig.Instance.envs,
          args: OpsConfig.Instance.args,
        },
      );
    }

    fs.accessSync(configPath, constants.F_OK);
    OpsConfig.Instance.config.loadFile(configPath);

    OpsConfig.Instance.config.validate({ allowed: 'strict' });
  }

  public static printableConfigPathPriority(): Array<string> {
    return OpsConfig.Instance.configPathPriority.printPriorities();
  }

  public static printableDotenvPathPriority(): Array<string> {
    return OpsConfig.Instance.dotenvPathPriority.printPriorities();
  }

  public static loadFromPathPriority(
    configArg: string | PathPriorityBuilderSync,
    dotenvArg?: string | PathPriorityBuilderSync,
  ) {
    if (typeof configArg === 'string') {
      if (OpsConfig.Instance.preset === 'cli') {
        OpsConfig.Instance.configPathPriority = new PathPriorityBuilderSync().useCliPreset(
          configArg,
        );
      } else if (OpsConfig.Instance.preset === 'server') {
        OpsConfig.Instance.configPathPriority = new PathPriorityBuilderSync().useServerPreset(
          configArg,
        );
      }
    } else if (configArg instanceof PathPriorityBuilderSync) {
      OpsConfig.Instance.configPathPriority = configArg;
    }

    if (typeof dotenvArg === 'string') {
      if (OpsConfig.Instance.preset === 'cli') {
        OpsConfig.Instance.dotenvPathPriority = new PathPriorityBuilderSync().useCliPreset(
          dotenvArg,
        );
      } else if (OpsConfig.Instance.preset === 'server') {
        OpsConfig.Instance.dotenvPathPriority = new PathPriorityBuilderSync().useServerPreset(
          dotenvArg,
        );
      }
    } else if (dotenvArg instanceof PathPriorityBuilderSync) {
      OpsConfig.Instance.dotenvPathPriority = dotenvArg;
    }

    if (!OpsConfig.Instance.config) {
      throw new Error('init() must be called before loadFromFile');
    }

    if (dotenvArg) {
      const [dotenvPath] = OpsConfig.Instance.dotenvPathPriority.generateSync();

      if (!dotenvPath) {
        throw new Error('could not find dotenv' + dotenvArg);
      }

      const result = dotenv({ path: dotenvPath });
      if (result.error) {
        throw result.error;
      }
      OpsConfig.Instance.config = convict(
        OpsConfig.Instance.schema as string | convict.Schema<unknown>,
        {
          env: OpsConfig.Instance.envs,
          args: OpsConfig.Instance.args,
        },
      );
    }

    const [configPath] = OpsConfig.Instance.configPathPriority.generateSync();

    if (!configPath) {
      throw new Error('could not find ' + configArg);
    }

    OpsConfig.Instance.config.loadFile(configPath);
    // Perform validation
    OpsConfig.Instance.config.validate({ allowed: 'strict' });
  }

  public static usePriorityPreset(preset: PathPriorityPreset) {
    OpsConfig.Instance.preset = preset;
    return this;
  }

  public static get<T>(
    ...args: GetParameterType<T>
  ): GetReturnType<T> | any | never {
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
