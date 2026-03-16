import { z } from "zod";
import * as schemas from "./api.ts";

// Automatically extract TypeScript types from your Zod schemas
export type HealthCheckResponse = z.infer<typeof schemas.HealthCheckResponse>;
export type ListCampaignsResponse = z.infer<typeof schemas.ListCampaignsResponse>;
export type CreateCampaignBody = z.infer<typeof schemas.CreateCampaignBody>;
export type GetCampaignResponse = z.infer<typeof schemas.GetCampaignResponse>;
export type DeleteCampaignResponse = z.infer<typeof schemas.DeleteCampaignResponse>;
export type GetCampaignResultsResponse = z.infer<typeof schemas.GetCampaignResultsResponse>;
export type GetCampaignReportResponse = z.infer<typeof schemas.GetCampaignReportResponse>;

// Generic API response types
export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  error: string;
};
