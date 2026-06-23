import { Schema, model, models, Types } from "mongoose";

export interface ISitemapUrl {
  _id: Types.ObjectId;
  url: string;
  label?: string;
  addedBy: string;
  addedAt: Date;
  lastScanAt?: Date;
  auditReportId?: string;
}

export interface IProjectSitemap {
  auditRequestId: string;
  urls: ISitemapUrl[];
  createdAt: Date;
  updatedAt: Date;
}

const SitemapUrlSchema = new Schema<ISitemapUrl>(
  {
    url: { type: String, required: true },
    label: { type: String },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
    lastScanAt: { type: Date },
    auditReportId: { type: String },
  },
  { _id: true }
);

const ProjectSitemapSchema = new Schema<IProjectSitemap>(
  {
    auditRequestId: { type: String, required: true, index: true },
    urls: { type: [SitemapUrlSchema], default: [] },
  },
  { timestamps: true }
);

export default models.ProjectSitemap ||
  model<IProjectSitemap>("ProjectSitemap", ProjectSitemapSchema);
