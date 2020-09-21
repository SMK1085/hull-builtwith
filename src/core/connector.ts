import { HullConnectorAttributeMapping } from "../types/hull-connector";

export interface PrivateSettings {
  /**
   * The API key from BuiltWith
   */
  api_key?: string | null;
  /**
   * The segments to use with the enrich API for accounts
   */
  account_synchronized_segments: string[];
  /**
   * The mapping for incoming account attributes
   */
  account_attributes_incoming: HullConnectorAttributeMapping[];
}

export interface LogPayload {
  channel: "operational" | "metric" | "error";
  component: string;
  code: string;
  message?: string | null;
  metricKey?: string | null;
  metricValue?: number | null;
  errorDetails?: any | null;
  errorMessage?: string | null;
  appId: string;
  tenantId: string;
  correlationKey?: string;
}
