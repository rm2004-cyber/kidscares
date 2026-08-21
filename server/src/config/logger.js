const stamp = () => new Date().toISOString();

const write = (level, colour, args) => {
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
    `\x1b[90m${stamp()}\x1b[0m ${colour}${level.toUpperCase()}\x1b[0m`,
    ...args,
  );
};

export const logger = {
  info: (...a) => write("info", "\x1b[36m", a),
  warn: (...a) => write("warn", "\x1b[33m", a),
  error: (...a) => write("error", "\x1b[31m", a),
  success: (...a) => write("info", "\x1b[32m", a),
};
