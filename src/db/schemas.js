import { Model } from 'objection';

/* ---Symbols for Private Members--- */
const CONNECTION = Symbol('Database Connect');
const SCHEMA = Symbol('Data Schema');


class ViewPort extends Model {}

export class ViolationsReport extends Model {
  static async createTable(connection) {
    await connection.schema.dropTableIfExists('violations');
    return connection.schema.createTableIfNotExists('violations', (table) => {
      table.increments('id').primary();
      table.string('url');
      table.string('viewPort');
      table.string('report');
    });
  }

  static get tableName() {
    return 'violations';
  }
}

export class PassesReport extends Model {
  static async createTable(connection) {
    await connection.schema.dropTableIfExists('passes');
    return connection.schema.createTableIfNotExists('passes', (table) => {
      table.increments('id').primary();
      table.string('url');
      table.string('viewPort');
      table.string('report');
    });
  }

  static get tableName() {
    return 'passes';
  }
}

export class AxeResult extends Model {
  static async createTable(connection) {
    await connection.schema.dropTableIfExists('axe_results');
    return connection.schema.createTableIfNotExists('axe_results', (table) => {
      table.increments('id').primary();
      table.string('url').unique();
    });
  }

  static get tableName() {
    return 'axe_results';
  }

  static get relationMappings() {
    return {
      violations: {
        relation: Model.HasManyRelation,
        modelClass: ViolationsReport,
        join: {
          from: 'violations.url',
          to: 'axe_results.url',
        },
      },
      passes: {
        relation: Model.HasManyRelation,
        modelClass: PassesReport,
        join: {
          from: 'passes.url',
          to: 'axe_results.url',
        },
      },
    };
  }
}
