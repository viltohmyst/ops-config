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

export class GoodConfig {
  private static _instance: GoodConfig;

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
    if (GoodConfig.Instance.enableLog) {
      return GoodConfig.Instance._log;
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
    GoodConfig.Instance._log = logger;
    GoodConfig.Instance.enableLog = true;
    return this;
  }

  public static enableLogs(enable: boolean) {
    GoodConfig.Instance.enableLog = enable;
    return this;
  }

  public static setSchema(schema: string | convict.Schema<unknown>) {
    GoodConfig.Instance.schema = schema;
    return this;
  }

  public static setArgs(args: { [key: string]: string }) {
    const argsKeys = Object.keys(args);
    const formattedArgs: Array<string> = [];
    argsKeys.forEach((key) => {
      formattedArgs.push(`--${key}`, args[key]);
    });
    GoodConfig.Instance.args = formattedArgs;
    return this;
  }

  public static clearArgs() {
    delete GoodConfig.Instance.args;
    return this;
  }

  public static setEnvs(envs: { [key: string]: string }) {
    GoodConfig.Instance.envs = envs;
    return this;
  }

  public static clearEnvs() {
    delete GoodConfig.Instance.envs;
    return this;
  }

  public static init(
    schema?: string | convict.Schema<unknown>,
    envs?: { [key: string]: string },
    args?: Array<string>,
  ): void | never {
    GoodConfig.Instance.schema = schema || GoodConfig.Instance.schema;
    GoodConfig.Instance.args = args || GoodConfig.Instance.args;
    GoodConfig.Instance.envs = envs || GoodConfig.Instance.envs;
    if (GoodConfig.Instance.schema) {
      GoodConfig.Instance.config = convict(GoodConfig.Instance.schema, {
        env: GoodConfig.Instance.envs,
        args: GoodConfig.Instance.args,
      });
      GoodConfig.log.debug(
        'Successfully initialized config with :',
        GoodConfig.Instance.schema,
        GoodConfig.Instance.envs,
        GoodConfig.Instance.args,
      );
    } else {
      const errorMessage =
        'setSchema(schema) must be called before invoking init()';
      GoodConfig.log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  public static loadFromFile(configPath: string, dotenvPath?: string) {
    if (!GoodConfig.Instance.config) {
      throw new Error('init() must be called before loadFromFile');
    }

    if (dotenvPath) {
      const result = dotenv({ path: dotenvPath });
      if (result.error) {
        throw result.error;
      }
      GoodConfig.Instance.config = convict(
        GoodConfig.Instance.schema as string | convict.Schema<unknown>,
        {
          env: GoodConfig.Instance.envs,
          args: GoodConfig.Instance.args,
        },
      );
    }

    fs.accessSync(configPath, constants.F_OK);
    GoodConfig.Instance.config.loadFile(configPath);

    GoodConfig.Instance.config.validate({ allowed: 'strict' });
  }

  public static printableConfigPathPriority(): Array<string> {
    return GoodConfig.Instance.configPathPriority.printPriorities();
  }

  public static printableDotenvPathPriority(): Array<string> {
    return GoodConfig.Instance.dotenvPathPriority.printPriorities();
  }

  public static loadFromPathPriority(
    configArg: string | PathPriorityBuilderSync,
    dotenvArg?: string | PathPriorityBuilderSync,
  ) {
    if (typeof configArg === 'string') {
      if (GoodConfig.Instance.preset === 'cli') {
        GoodConfig.Instance.configPathPriority = new PathPriorityBuilderSync().useCliPreset(
          configArg,
        );
      } else if (GoodConfig.Instance.preset === 'server') {
        GoodConfig.Instance.configPathPriority = new PathPriorityBuilderSync().useServerPreset(
          configArg,
        );
      }
    } else if (configArg instanceof PathPriorityBuilderSync) {
      GoodConfig.Instance.configPathPriority = configArg;
    }

    if (typeof dotenvArg === 'string') {
      if (GoodConfig.Instance.preset === 'cli') {
        GoodConfig.Instance.dotenvPathPriority = new PathPriorityBuilderSync().useCliPreset(
          dotenvArg,
        );
      } else if (GoodConfig.Instance.preset === 'server') {
        GoodConfig.Instance.dotenvPathPriority = new PathPriorityBuilderSync().useServerPreset(
          dotenvArg,
        );
      }
    } else if (dotenvArg instanceof PathPriorityBuilderSync) {
      GoodConfig.Instance.dotenvPathPriority = dotenvArg;
    }

    if (!GoodConfig.Instance.config) {
      throw new Error('init() must be called before loadFromFile');
    }

    if (dotenvArg) {
      const [
        dotenvPath,
      ] = GoodConfig.Instance.dotenvPathPriority.generateSync();

      if (!dotenvPath) {
        throw new Error('could not find dotenv' + dotenvArg);
      }

      const result = dotenv({ path: dotenvPath });
      if (result.error) {
        throw result.error;
      }
      GoodConfig.Instance.config = convict(
        GoodConfig.Instance.schema as string | convict.Schema<unknown>,
        {
          env: GoodConfig.Instance.envs,
          args: GoodConfig.Instance.args,
        },
      );
    }

    const [configPath] = GoodConfig.Instance.configPathPriority.generateSync();

    if (!configPath) {
      throw new Error('could not find ' + configArg);
    }

    GoodConfig.Instance.config.loadFile(configPath);
    // Perform validation
    GoodConfig.Instance.config.validate({ allowed: 'strict' });
  }

  public static usePriorityPreset(preset: PathPriorityPreset) {
    GoodConfig.Instance.preset = preset;
    return this;
  }

  public static get<T>(
    ...args: GetParameterType<T>
  ): GetReturnType<T> | any | never {
    if (GoodConfig.Instance.config) {
      return GoodConfig.Instance.config.get(...args);
    } else {
      const errorMessage =
        'setSchema(schema) and init() must first be called before using a get(key) method';
      GoodConfig.log.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
