# GoodConfig

Easy to use config module with good defaults. Comes with everything you need.

**The Why? :**

> Every application whether a CLI or Server app needs to use a configuration file to be flexible. For a config file to be useful, first it needs to be found. Most config libraries omit the part of finding the file (which is understandable since it wants to do one thing well). Hence alot of the applications I made would have their own config file finding routines and conventions. This module wraps the functionality of mozilla's node-convict module with methods to find the config file in good default locations (using my other module path-priority).

## Features

- Find your configs in your OS's standardized locations
- When developing, find configs in your project directory instead
- Combine your configs with dotenv files, environment variables and command line arguments.

## Install

```bash
npm install good-config # already includes typescript definitions
```

## Usage

```typescript
import { GoodConfig } from 'good-config';

// under the hood GoodConfig uses node-convict and thus uses it's schema standard
const schema = {
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test', 'debug'],
    default: 'development',
    env: 'NODE_ENV',
  },
  ip: {
    doc: 'The IP address to bind.',
    format: 'ipaddress',
    default: '127.0.0.1',
    env: 'IP_ADDRESS',
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 8080,
    env: 'PORT',
    arg: 'port',
  },
  db: {
    host: {
      doc: 'Database host name/IP',
      format: '*',
      default: 'default',
      env: 'DB_HOST',
    },
    name: {
      doc: 'Database name',
      format: String,
      default: 'users',
    },
  },
};

GoodConfig.init(schema);
GoodConfig.loadFromPathPriority('config/config.yaml');
const port = GoodConfig.get('port');
```
