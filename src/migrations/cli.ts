// Migrations create their indexes explicitly via `createIndexes()`, so
// Mongoose's own auto-indexing must stay out of the way — otherwise it races
// the de-dup step and fails to build a unique index over not-yet-cleaned
// data. Forcing production mode here makes every schema's
// `autoIndex: process.env.NODE_ENV !== "production"` evaluate to false.
process.env.NODE_ENV = "production";

const runner = require("./runner");
const { migrations } = require("./index");

// `node dist/migrations/cli.js [status]`
const command = process.argv[2];

(async () => {
  try {
    if (command === "status") {
      await runner.status(migrations);
    } else {
      await runner.run(migrations);
    }
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();
