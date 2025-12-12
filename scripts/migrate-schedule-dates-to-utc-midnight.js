// scripts/migrate-schedule-dates-to-utc-midnight.js
import dotenv from "dotenv";
dotenv.config();

import dbConnect from "../src/lib/mongoose.js";
import Schedule from "../src/models/Schedule.js";

function shouldShiftToUtcMidnight(d) {
  // ถ้าเป็น 17:00Z (ซึ่งคือ 00:00 เวลาไทย) ให้ shift +7h
  return (
    d instanceof Date &&
    !Number.isNaN(d.getTime()) &&
    d.getUTCHours() === 17 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0
  );
}

async function main() {
  await dbConnect();

  const cursor = Schedule.find({ dates: { $exists: true, $ne: [] } }).cursor();

  let updated = 0;
  let scanned = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    scanned++;

    let changed = false;
    const newDates = (doc.dates || []).map((d) => {
      const dt = new Date(d);
      if (shouldShiftToUtcMidnight(dt)) {
        changed = true;
        return new Date(dt.getTime() + 7 * 60 * 60 * 1000); // +7 hours
      }
      return dt;
    });

    if (changed) {
      doc.dates = newDates;
      await doc.save();
      updated++;
    }
  }

  console.log({ scanned, updated });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
