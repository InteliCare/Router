import { Context, HttpMethod } from "@azure/functions";

const NOT_FOUND = 404;

export type StatusCode = number;

export interface HttpResponse<T> {
  headers?: {
    [header: string]: string;
  };
  status: StatusCode;
  body?: T;
}

export interface RouteHandler<params, responseBody> {
  (context: Context, params: params): Promise<HttpResponse<responseBody>>;
}

export interface Route<params, responseBody> {
  test: (method: HttpMethod, url: string) => boolean;
  handler: RouteHandler<params, responseBody>;
}

/**
 * Router utility class
 *
 * requires {*path} at the end of the path in your function.json to populate the context.bindingData.path variable
 * eg: /some/function/{*path}
 *
 * setup at the top scope of your function index
 * eg: const router = new Router();
 *
 * a route of '/' works with an empty path
 * eg: /some/function will trigger a route of "" or "/"
 *
 * can have multiple routes with different methods for the same urlpath
 * eg: addRoute('POST', '/some/url', handler) and addRoute('GET', '/some/url', handler)
 *
 * call Router.route(context) from the default export / run function;
 * eg: export default run(context: Context, request: HttpRequest): Promise<HttpResponse> { return router.route(context); }
 */
export class Router {

  private routeHandlers: Map<string, Route<any, any>>;

  public constructor() {
    this.routeHandlers = new Map<string, Route<any, any>>();
  }

  /**
   * Route handling function - trigger registered handlers
   * @param context Function context
   */
  public async route(context: Context): Promise<HttpResponse<any>> {
    for (const [key, value] of this.routeHandlers) {
      if (value.test(context.req.method, context.bindingData.path)) {
        const pathParts = key.split('/');
        pathParts.shift();
        const urlParts = context.bindingData.path && context.bindingData.path.split('/');
        const params = {};
        let index = 0;
        for (const part of pathParts) {
          if (part.startsWith('(')) {
            const param = part.replace(/[()]/g, '');
            params[param] = urlParts[index];
          }
          index++;
        }
        return value.handler(context, params);
      }
    }

    return {
      status: NOT_FOUND,
      body: null,
    };
  }

  /**
   * Add a route with handler
   * @param path string of form /param/(value)
   * @param handler function to handle data
   */
  public addRoute<params, responseBody>(method: HttpMethod, path: string, handler: RouteHandler<params, responseBody>): void {
    const pathParts = path.split('/');
    pathParts.shift();

    function test(requestMethod: HttpMethod, url = '') {
      if (requestMethod !== method) return false;

      const urlParts = url.split('/');
      let index = 0;
      for (const part of pathParts) {
        if (!part.startsWith('(') && urlParts[index] !== part) return false;
        index++;
      }
      if (index !== urlParts.length) return false;
      return true;
    }

    this.routeHandlers.set(method + path, {
      test,
      handler,
    });
  }

}
