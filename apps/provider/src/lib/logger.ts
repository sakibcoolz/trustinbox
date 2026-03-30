const PREFIX = "[provider-ui]";

export const logger = {
  log: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  info: (...args: unknown[]) => console.info(PREFIX, ...args),
  debug: (...args: unknown[]) => console.debug(PREFIX, ...args),
};
