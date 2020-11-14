module.exports = {
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
  stringType: {
    doc: 'string type.',
    format: String,
    default: 'default',
    arg: 'stringType',
  },
  boolFalse: {
    doc: 'boolean type false',
    format: Boolean,
    default: true,
    arg: 'boolFalse',
  },
  boolTrue: {
    doc: 'boolean type true',
    format: Boolean,
    default: false,
    arg: 'boolTrue',
  },
  numberType: {
    doc: 'number type.',
    format: Number,
    default: 100,
    arg: 'numberType',
  },
};
