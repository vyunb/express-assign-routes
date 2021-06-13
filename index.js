const fs = require("fs");
const { resolve } = require("path");

const requireAndResolve = (dir, file) => {
  const fn = require(resolve(dir, file));
  if (!fn.name.length) Object.defineProperty(fn, "name", { value: file.replace(/\.[0-9a-z]+$/i, ""), writable: false });
  return fn;
};

const splitLines = (str) =>
  str
    .split("\n")
    .join("")
    .split("\r")
    .filter((el) => el !== "");

module.exports = (router) =>
  function (
    routesDir = resolve(process.cwd(), "routes"),
    handlersDir = resolve(process.cwd(), "handlers"),
    middlewaresDir = resolve(process.cwd(), "middlewares"),
  ) {
    const handlers = new Map();
    const middlewares = new Map();
    fs.readdir(handlersDir, (err, data) => {
      if (err) throw err;
      data.forEach((file) => {
        const handler = requireAndResolve(handlersDir, file);
        handlers.set(handler.name, handler);
      });
    });
    fs.readdir(middlewaresDir, (err, data) => {
      if (err) throw err;
      data.forEach((file) => {
        const middleware = requireAndResolve(middlewaresDir, file);
        middlewares.set(middleware.name, middleware);
      });
    });
    fs.readFile(routesDir, { encoding: "utf8" }, (err, data) => {
      if (err) throw err;
      const routeParts = splitLines(data);

      routeParts.forEach((route) => {
        route = route.split(" ");
        const args = new Array();
        const path = route.shift();
        const method = route.pop().toLowerCase();
        const handler = route.pop();
        if (handlers.has(handler)) {
          args.push(path);
          route.forEach((layers) => middlewares.has(layers) && args.push(middlewares.get(layers)));
          args.push(handlers.get(handler));
          router[method](...args);
        }
      });
    });

    return router;
  };
