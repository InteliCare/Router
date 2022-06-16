import { Context, ExecutionContext, Logger } from "@azure/functions";
import { expect } from "chai";
import { stub } from "sinon";
import { v4 as uuid } from 'uuid';

import { Router } from '../src/Router';

const NOT_FOUND = 404;

describe('Router will route based on route segments', () => {

  it('should allow multiple methods per route', async () => {
    const router = new Router();
    const method1stub = stub();
    const method2stub = stub();

    router.addRoute('POST', '/the/same/path', method1stub);
    router.addRoute('PUT', '/the/same/path', method2stub);

    const call1context = getMockContext();
    call1context.bindingData.path = 'the/same/path';
    call1context.req = {
      ...call1context.req,
      method: 'POST',
    };

    await router.route(call1context);

    const call2context = getMockContext();
    call2context.bindingData.path = 'the/same/path';
    call2context.req = {
      ...call2context.req,
      method: 'PUT',
    };

    await router.route(call2context);

    expect(method1stub.callCount).to.equal(1);
    expect(method2stub.callCount).to.equal(1);

  });

  it('should handle empty (undefined) path', async () => {
    const router = new Router();
    const userRouteStub = stub();
    router.addRoute<void, { data: any }>("GET", '/', userRouteStub);

    const context = getMockContext();
    // context.bindingData.path = '';
    context.req = {
      ...context.req,
      method: "GET",
    };

    await router.route(context);
    expect(userRouteStub.callCount).to.equal(1);
    expect(userRouteStub.args[0][1]).to.be.empty;
  });

  it('should handle empty (undefined) path and normal path', async () => {
    const router = new Router();
    const userRouteStub = stub();
    const anotherRouteStub = stub();
    router.addRoute<void, { data: any }>("GET", '/', userRouteStub);
    router.addRoute<void, { data: any }>("GET", "/some/path", anotherRouteStub);

    const context = getMockContext();
    // context.bindingData.path = '';
    context.req = {
      ...context.req,
      method: "GET",
    };

    await router.route(context);
    expect(userRouteStub.callCount).to.equal(1);
    expect(userRouteStub.args[0][1]).to.be.empty;
    expect(anotherRouteStub.callCount).to.equal(0);

    context.bindingData.path = 'some/path';
    await router.route(context);

    expect(anotherRouteStub.callCount).to.equal(1);

  });

  it('should return not found if url does not match route path', async () => {
    const router = new Router();
    const userRouteStub = stub();
    router.addRoute<{ nodeId: string, userId: string }, { userDetails: any }>("GET", '/users/(userId)', userRouteStub);

    const context = getMockContext();
    context.bindingData.path = 'nodes/someNodeId/users/someUserId/access';
    context.req = {
      ...context.req,
      method: "GET",
    };

    const result = await router.route(context);
    expect(userRouteStub.callCount).to.equal(0);
    expect(result.status).to.equal(NOT_FOUND);
  });

  it('should return not found if method does not match route method', async () => {
    const router = new Router();
    const userRouteStub = stub();
    router.addRoute<{ nodeId: string, userId: string }, { userDetails: any }>("GET", '/users/(userId)', userRouteStub);

    const context = getMockContext();
    context.bindingData.path = 'users/someUserId';
    context.req = {
      ...context.req,
      method: "DELETE",
    };

    const result = await router.route(context);
    expect(userRouteStub.callCount).to.equal(0);
    expect(result.status).to.equal(NOT_FOUND);
  });

  it('should process route segments and turn parameters into values from url', async () => {
    const router = new Router();
    const userRouteStub = stub();
    router.addRoute("POST", '/users/(userId)', userRouteStub);

    const context = getMockContext();
    context.bindingData.path = 'users/someUserId';
    context.req = {
      ...context.req,
      method: "POST",
    };

    await router.route(context);
    expect(userRouteStub.callCount).to.equal(1);
    expect(userRouteStub.args[0][1]).to.deep.equal({ userId: 'someUserId' });
  });

  it('should process multiple route segments into parameters', async () => {
    const router = new Router();
    const userRouteStub = stub();
    router.addRoute("POST", '/nodes/(nodeId)/users/(userId)/access', userRouteStub);

    const context = getMockContext();
    context.bindingData.path = 'nodes/someNodeId/users/someUserId/access';
    context.req = {
      ...context.req,
      method: "POST",
    };

    await router.route(context);
    expect(userRouteStub.callCount).to.equal(1);
    expect(userRouteStub.args[0][1]).to.deep.equal({ nodeId: 'someNodeId', userId: 'someUserId' });
  });

  it('should send similar routes to the correct functions', async () => {
    const router = new Router();
    const basicRouteHandler = stub();
    const extendedRouteHandler = stub();
    router.addRoute("GET", '/route/(param)', basicRouteHandler);
    router.addRoute("GET", '/route/(param)/detail', extendedRouteHandler);

    const context = getMockContext();
    context.bindingData.path = 'route/paramvalue/detail';
    context.req = {
      ...context.req,
      method: "GET",
    };

    await router.route(context);
    expect(basicRouteHandler.callCount).to.equal(0);
    expect(extendedRouteHandler.callCount).to.equal(1);
  });

  it('should allow undefined body', () => {
    const router = new Router();

    router.addRoute<never, string>("GET", '/some/path', async (context) => {
      return {
        status: 123
      };
    });
  });

});


const getMockContext = (): Context => {
  const executionContext: ExecutionContext = {
    functionDirectory: '.',
    functionName: 'functionName',
    invocationId: uuid(),
    retryContext: null,
  };

  const logger: Logger = (message): void => console.log(message);
  logger.verbose = (message): void => console.log(message);
  logger.info = (message): void => console.log(message);
  logger.warn = (message): void => console.log(message);
  logger.error = (message): void => console.log(message);

  const context: Context = {
    invocationId: executionContext.invocationId,
    executionContext: executionContext,
    bindings: {},
    bindingData: {
      invocationId: executionContext.invocationId,
    },
    traceContext: {
      traceparent: uuid(),
      attributes: {},
      tracestate: 'doing-ok',
    },
    bindingDefinitions: [],
    log: logger,
    done: (err: string): void => { console.log(err); },
  };

  return context;
}
