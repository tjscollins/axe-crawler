import path from 'path';
import Knex from 'knex';
import objection from 'objection';

import queries from './queries.js';

/* ---Symbols For Private Variables--- */
const TYPE = Symbol('Database type');
const CREATE = Symbol('Database CREATE');
const READ = Symbol('Database READs');
const UPDATE = Symbol('Database UPDATE');
const DELETE = Symbol('Database DELETE');

export default class DatabaseConnectionManager {
  constructor({ type = 'memory' }) {
    this[TYPE] = type;
  }

  async initialize() {
    switch (this[TYPE]) {
      case 'memory':
        this._db = Knex({
          client: 'sqlite3',
          connection: {
            filename: ':memory:',
          },
        });
        break;
      case 'file':
        this._db = Knex({
          client: 'sqlite3',
          connection: {
            filename: './axe-crawler.sqlite',
          },
        });
        break;
      default:
        throw new TypeError('Invalid SQLite database type');
    }

    const connectedQueries = await queries(this._db);
    this[CREATE] = connectedQueries.create;
    this[READ] = connectedQueries.read;
    this[UPDATE] = connectedQueries.update;
    this[DELETE] = connectedQueries.delete;
  }

  close() {
    this._db.close();
  }

  create(id, data) {
    return this[CREATE][id](data);
  }

  read(id, data) {
    return this[READ][id](data);
  }

  update(id, data) {
    return this[UPDATE][id](data);
  }

  delete(id, data) {
    return this[DELETE][id](data);
  }
}
