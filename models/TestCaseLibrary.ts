import { Schema, model, models } from "mongoose";

// disabilityTypes reuses the same vocabulary as User.testerProfile.disabilityTypes
// (app/dashboard/profile/page.tsx disabilityOptions), minus "none" — every
// library entry targets at least one concrete disability type.
export type LibraryDisabilityType =
  | "blind"
  | "low_vision"
  | "deaf"
  | "hard_of_hearing"
  | "motor"
  | "cognitive";

export type LibraryAssistiveTech =
  | "screen_reader"
  | "keyboard"
  | "magnifier"
  | "switch_access";

export type WcagLevel = "A" | "AA" | "AAA";
export type WcagPrinciple = "Perceivable" | "Operable" | "Understandable" | "Robust";

export interface ITestCaseLibrary {
  libId: string; // "LIB-001", "LIB-002", ...
  wcagVersion: string; // "2.2"
  wcagCriterion: string; // "1.1.1"
  wcagTitle: string; // "Non-text Content"
  wcagLevel: WcagLevel;
  wcagPrinciple: WcagPrinciple;
  title: string; // generic test case title
  description: string;
  steps: string[]; // generic test steps
  expectedResult: string;
  failCondition: string;
  disabilityTypes: LibraryDisabilityType[];
  assistiveTech: LibraryAssistiveTech[];
  applicableWhen: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseLibrarySchema = new Schema<ITestCaseLibrary>(
  {
    libId: { type: String, required: true, unique: true },
    wcagVersion: { type: String, required: true, default: "2.2" },
    wcagCriterion: { type: String, required: true },
    wcagTitle: { type: String, required: true },
    wcagLevel: { type: String, enum: ["A", "AA", "AAA"], required: true },
    wcagPrinciple: {
      type: String,
      enum: ["Perceivable", "Operable", "Understandable", "Robust"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    steps: { type: [String], default: [] },
    expectedResult: { type: String, required: true },
    failCondition: { type: String, required: true },
    disabilityTypes: {
      type: [String],
      enum: ["blind", "low_vision", "deaf", "hard_of_hearing", "motor", "cognitive"],
      default: [],
    },
    assistiveTech: {
      type: [String],
      enum: ["screen_reader", "keyboard", "magnifier", "switch_access"],
      default: [],
    },
    applicableWhen: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TestCaseLibrarySchema.index({ wcagCriterion: 1 });

export default models.TestCaseLibrary ||
  model<ITestCaseLibrary>("TestCaseLibrary", TestCaseLibrarySchema);
