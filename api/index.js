import app, { ready } from '../server/server.js';

export default async function handler(req, res) {
  await ready;
  return app(req, res);
}
