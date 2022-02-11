import { MongoClient } from "mongodb";
import { performance, PerformanceObserver } from "perf_hooks";

const TIMES = 21;

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry.name, Math.round(entry.duration / TIMES), "ms");
  });
});
perfObserver.observe({ entryTypes: ["measure"] });

async function run() {
  const url = "mongodb://localhost:27017";
  const client = new MongoClient(url);
  const dbName = "blog-post-composed-index";
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("runs");
  const toBench = [
    {
      indexes: [],
      name: "no index",
    },
    {
      indexes: [[{ date: 1, status: 1 }]],
      name: "date_status",
    },
    {
      indexes: [[{ date: 1 }], [{ status: 1 }]],
      name: "date and status",
    },
    {
      indexes: [[{ status: 1, date: 1 }]],
      name: "status_date",
    },
    {
      indexes: [[{ date: 1 }]],
      name: "date",
    },
    {
      indexes: [[{ status: 1 }]],
      name: "status",
    },
    {
      indexes: [[{ status: 1, date: 1 }], [{ date: 1 }]],
      name: "status_date and date",
    },
    {
      indexes: [[{ date: 1 }], [{ date: 1, status: 1 }]],
      name: "date and date_status",
    },
    {
      indexes: [
        [
          { date: 1 },
          { name: "partial", partialFilterExpression: { status: "error" } },
        ],
        [{ date: 1 }],
      ],
      name: "partial date and date",
    },
    {
      indexes: [
        [
          { date: 1 },
          { name: "partial", partialFilterExpression: { status: "error" } },
        ],
      ],
      name: "partial date",
    },
  ];
  for (const config of toBench) {
    console.log("======", config.name, "======");
    await collection.dropIndexes();

    for (const index of config.indexes) {
      //@ts-expect-error
      await collection.createIndex(...index);
    }
    const indexSizes = (await collection.stats()).indexSizes;
    const sum =
      Object.values(indexSizes).reduce((acc, size) => acc + size, 0) -
      indexSizes._id_;
    console.log(
      "Indexes size",
      indexSizes,
      " or ",
      Math.round(sum / (1024 * 1024)),
      "Mb"
    );
    performance.mark(`${config.name} status-date start`);

    for (let i = 0; i < TIMES; i += 1) {
      await collection
        .find({
          status: "error",
          date: {
            $gt: new Date("1500-01-01T00:00:00.000Z"),
            $lt: new Date("1510-01-01T00:00:00.000Z"),
          },
        })
        .count();
    }
    performance.mark(`${config.name} status-date end`);
    performance.measure(
      `${config.name} status-date`,
      `${config.name} status-date start`,
      `${config.name} status-date end`
    );

    performance.mark(`${config.name} date start`);
    for (let i = 0; i < TIMES; i += 1) {
      await collection
        .find({ date: { $eq: new Date("1500-01-01T00:00:00.000Z") } })
        .count();
    }
    performance.mark(`${config.name} date end`);
    performance.measure(
      `${config.name} date`,
      `${config.name} date start`,
      `${config.name} date end`
    );

    performance.mark(`${config.name} date smart start`);
    for (let i = 0; i < TIMES; i += 1) {
      await collection
        .find({
          status: { $in: ["error", "success"] },
          date: { $eq: new Date("1500-01-01T00:00:00.000Z") },
        })
        .count();
    }
    performance.mark(`${config.name} date smart end`);
    performance.measure(
      `${config.name} date smart`,
      `${config.name} date smart start`,
      `${config.name} date smart end`
    );
  }

  await client.close();
}

run();
