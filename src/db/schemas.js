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

class PassesReport extends Model {}

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
    };
  }
}
