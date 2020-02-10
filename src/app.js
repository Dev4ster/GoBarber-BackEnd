import express from 'express';
import path from 'path';
import * as Sentry from '@sentry/node';
import routes from './routes';
import './database';
import configSentry from './config/sentry';

class App {
  constructor() {
    this.server = express();
    Sentry.init(configSentry);
    this.middlewres();
    this.routes();
  }

  middlewres() {
    this.server.use(Sentry.Handlers.requestHandler());
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }
}
export default new App().server;
