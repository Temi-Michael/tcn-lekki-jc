import mongoose from "mongoose";

const FormFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["text", "number", "email", "textarea", "date", "boolean", "select"],
    required: true,
  },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
});

const FormSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
    fields: [FormFieldSchema],
  },
  { timestamps: true }
);

if (mongoose.models.Form) {
  delete mongoose.models.Form;
}

export default mongoose.model("Form", FormSchema);
