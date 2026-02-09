/**
 * Vite dev server plugin that adds a PUT endpoint for saving schedule assignments.
 *
 * Only active during `pnpm dev` (Vite's configureServer hook).
 * Does nothing in production builds.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Minimal Vite Plugin interface (avoids importing vite as a direct dependency) */
interface VitePlugin {
  name: string;
  configureServer?: (server: {
    middlewares: {
      use: (
        fn: (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void
        ) => void
      ) => void;
    };
  }) => void;
}

export function scheduleApiPlugin(): VitePlugin {
  return {
    name: 'schedule-api',
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          // Match PUT /api/schedule/:month
          const match = req.url?.match(/^\/api\/schedule\/([\d]{4}-[\d]{2})$/);
          if (!match || req.method !== 'PUT') {
            return next();
          }

          const month = match[1];
          const schedulePath = path.resolve('schedules', `${month}.json`);

          // Read request body
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }

          try {
            const { weekOf, assignments } = JSON.parse(body);

            if (!weekOf || !assignments) {
              res.statusCode = 400;
              res.end('Missing weekOf or assignments');
              return;
            }

            // Read existing schedule
            if (!fs.existsSync(schedulePath)) {
              res.statusCode = 404;
              res.end(`Schedule file not found: ${month}.json`);
              return;
            }

            const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));

            // Find and patch the week
            const weekIndex = schedule.weeks.findIndex(
              (w: { weekOf: string }) => w.weekOf === weekOf
            );

            if (weekIndex === -1) {
              res.statusCode = 404;
              res.end(`Week ${weekOf} not found in ${month}.json`);
              return;
            }

            schedule.weeks[weekIndex].assignments = assignments;

            // Write back
            fs.writeFileSync(
              schedulePath,
              JSON.stringify(schedule, null, 2) + '\n'
            );

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, weekOf }));
          } catch (err) {
            res.statusCode = 500;
            res.end(
              err instanceof Error ? err.message : 'Internal server error'
            );
          }
        }
      );
    },
  };
}
