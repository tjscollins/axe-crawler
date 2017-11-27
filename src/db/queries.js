import {
  AxeResult,
  ViolationsReport,
  PassesReport,
} from './schemas.js';

import Logger from '../logger.js';

export default async function queries(knex) {
  const log = new Logger('debug');

  AxeResult.knex(knex);
  ViolationsReport.knex(knex);
  PassesReport.knex(knex);
  await AxeResult.createTable(knex);
  await ViolationsReport.createTable(knex);
  await PassesReport.createTable(knex);

  const create = {
    axe_result: async ({
      url, viewPort, violations, passes,
    }) => Promise.all([
      AxeResult
        .query()
        .insert({ url })
        .catch((err) => {
          // Drop and ignore duplicate urls, otherwise throw error
          if (!err.message.match('SQLITE_CONSTRAINT: UNIQUE')) {
            throw err;
          }
        }),
      ViolationsReport
        .query()
        .insert({ url, viewPort, report: violations }),
      PassesReport
        .query()
        .insert({ url, viewPort, report: passes }),
    ]).catch((err) => {
      log.error(err);
    }),
  };

  const read = {
    axe_result: ({ url, viewPort }) => {
      AxeResult
        .query()
        // .where('url', url)
        .then(res => log.debug(`Result received: ${JSON.stringify(res)}`))
        .catch(err => log.error(`Error reading from DB: ${err}`));

      ViolationsReport
        .query()
        // .where('url', url)
        .then(res => log.debug(`Result received: ${JSON.stringify(res)}`))
        .catch(err => log.error(`Error reading from DB: ${err}`));
    },

    tested_pages: () => AxeResult
      .query(),

    violations_summary: ({ url }) => ViolationsReport
      .query()
      .where('url', url),

    passes_summary: ({ url }) => PassesReport
      .query()
      .where('url', url),

    summary: async ({ url }) => {
      const violations = await ViolationsReport.query().where('url', url);
      const passes = await PassesReport.query().where('url', url);
      return { violations, passes };
    },
  };

  const update = {};

  const del = {};

  return {
    create,
    read,
    update,
    delete: del,
  };
}

