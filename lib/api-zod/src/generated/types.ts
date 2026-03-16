import { z } from "zod";
import * as schemas from "./api.ts";

// This exports the TypeScript types based on your Zod schemas
export type ApiSchemas = typeof schemas;

// Example of common types usually found here
export type SuccessResponse = {
  success: true;
  data: any;
};

export type ErrorResponse = {
  success: false;
  error: string;
};
