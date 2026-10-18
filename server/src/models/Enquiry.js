import mongoose from "mongoose";

/** General enquiries from the contact form (not orders). */
const EnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    topic: { type: String, default: "General question" },
    message: { type: String, required: true },
    people: { type: Number, default: null },
    eventDate: { type: Date },
    handled: { type: Boolean, default: false },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

EnquirySchema.index({ createdAt: -1, handled: 1 });

export const Enquiry = mongoose.model("Enquiry", EnquirySchema);
