import { Schema, model, models } from "mongoose";

export interface ITestStep {
  order: number;
  instruction: string;
}

export interface ITesterResult {
  testerId: string;
  status: "pending" | "pass" | "fail" | "skip";
  note?: string;
  attachments: {
    name: string;
    size: number;
    type: string;
    url?: string;
    publicId?: string;
    uploadedAt: Date;
  }[];
  testedAt?: Date;
}

export interface ITestCase {
  scenarioId: string;
  auditRequestId: string;
  title: string;
  description?: string;
  steps: ITestStep[];
  expectedResult: string;
  priority: "low" | "medium" | "high" | "critical";
  order: number;
  results: ITesterResult[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestStepSchema = new Schema<ITestStep>(
  {
    order: { type: Number, required: true },
    instruction: { type: String, required: true },
  },
  { _id: false }
);

const ResultAttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
    url: { type: String },
    publicId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TesterResultSchema = new Schema<ITesterResult>(
  {
    testerId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "pass", "fail", "skip"],
      default: "pending",
    },
    note: { type: String, default: "" },
    attachments: { type: [ResultAttachmentSchema], default: [] },
    testedAt: { type: Date },
  },
  { _id: true }
);

const TestCaseSchema = new Schema<ITestCase>(
  {
    scenarioId: { type: String, required: true, index: true },
    auditRequestId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    steps: { type: [TestStepSchema], default: [] },
    expectedResult: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    order: { type: Number, default: 0 },
    results: { type: [TesterResultSchema], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

TestCaseSchema.index({ scenarioId: 1, order: 1 });

export default models.TestCase || model<ITestCase>("TestCase", TestCaseSchema);
