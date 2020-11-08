import * as convict from 'convict';

declare module 'convict-format-with-moment' {
  export const duration: convict.Format;
  export const timestamp: convict.Format;
}
