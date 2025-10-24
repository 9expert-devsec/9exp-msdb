import mongoose, { Schema } from "mongoose";

const EventResponseSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", index: true },
  answers: Schema.Types.Mixed, // { key: value }
}, { timestamps: true });

export default mongoose.models.EventResponse || mongoose.model("EventResponse", EventResponseSchema);
