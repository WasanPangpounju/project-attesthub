import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageView extends Document {
  path: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    path: { type: String, required: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'pageviews' }
);

const PageView: Model<IPageView> =
  mongoose.models.PageView || mongoose.model<IPageView>('PageView', PageViewSchema);

export default PageView;
