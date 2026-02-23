import { Schema, model, models } from "mongoose";

export interface IScenario {
  auditRequestId: string;
  title: string;
  description?: string;
  assignedTesterId: string;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScenarioSchema = new Schema<IScenario>(
  {
    auditRequestId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTesterId: { type: String, required: true },
    order: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

ScenarioSchema.index({ auditRequestId: 1, order: 1 });

export default models.Scenario || model<IScenario>("Scenario", ScenarioSchema);
