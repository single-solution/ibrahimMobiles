import mongoose, { Schema, type Model } from "mongoose";

export const ANALYTICS_EVENT_TYPES = ["page_view", "web_vital", "custom", "search", "error_404"] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const WEB_VITAL_METRICS = ["LCP", "CLS", "INP", "FID", "TTFB"] as const;
export type WebVitalMetric = (typeof WEB_VITAL_METRICS)[number];

export const VITAL_RATINGS = ["good", "needs-improvement", "poor"] as const;
export type VitalRating = (typeof VITAL_RATINGS)[number];

export const DEVICE_TYPES = ["mobile", "desktop", "tablet"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface AnalyticsEventAttributes {
	eventType: AnalyticsEventType;
	path: string;
	title?: string;
	referrer?: string;
	sessionId: string;
	visitorId?: string;
	device: DeviceType;
	browser?: string;
	os?: string;
	country?: string;
	city?: string;
	region?: string;
	vitalMetric?: WebVitalMetric;
	vitalValue?: number;
	vitalRating?: VitalRating;
	durationMs?: number;
	eventName?: string;
	eventData?: Record<string, unknown>;
}

const analyticsEventSchema = new Schema<AnalyticsEventAttributes>(
	{
		eventType: { type: String, enum: ANALYTICS_EVENT_TYPES, required: true, index: true },
		path: { type: String, required: true, trim: true, index: true },
		title: { type: String, trim: true },
		referrer: { type: String, trim: true },
		sessionId: { type: String, required: true, trim: true, index: true },
		visitorId: { type: String, trim: true },
		device: { type: String, enum: DEVICE_TYPES, default: "desktop" },
		browser: { type: String, trim: true },
		os: { type: String, trim: true },
		country: { type: String, trim: true },
		city: { type: String, trim: true, index: true },
		region: { type: String, trim: true },
		vitalMetric: { type: String, enum: WEB_VITAL_METRICS, index: true },
		vitalValue: { type: Number },
		vitalRating: { type: String, enum: VITAL_RATINGS },
		durationMs: { type: Number, default: 0 },
		eventName: { type: String, trim: true, index: true },
		eventData: { type: Schema.Types.Mixed },
	},
	{ timestamps: true },
);

analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ path: 1, createdAt: -1 });
analyticsEventSchema.index({ vitalMetric: 1, createdAt: -1 });
analyticsEventSchema.index({ sessionId: 1, createdAt: -1 });
analyticsEventSchema.index({ eventName: 1, createdAt: -1 });
analyticsEventSchema.index({ city: 1, createdAt: -1 });

export const AnalyticsEvent: Model<AnalyticsEventAttributes> =
	(mongoose.models.AnalyticsEvent as Model<AnalyticsEventAttributes>) ??
	mongoose.model<AnalyticsEventAttributes>("AnalyticsEvent", analyticsEventSchema);
