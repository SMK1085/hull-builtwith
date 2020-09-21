export type ApiMethod =
  | "delete"
  | "get"
  | "GET"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export interface ApiResultObject<TPayload, TData, TError> {
  endpoint: string;
  method: ApiMethod;
  payload: TPayload | undefined;
  data?: TData;
  success: boolean;
  error?: string | string[];
  errorDetails?: TError;
}

export type OutgoingOperationType = "enrich" | "prospect" | "skip";
export type OutgoingOperationObjectType = "user" | "event" | "account";

export interface OutgoingOperationEnvelope<TMessage, TServiceObject> {
  message: TMessage;
  serviceObject?: TServiceObject;
  operation: OutgoingOperationType;
  objectType: OutgoingOperationObjectType;
  notes?: string[];
}

export interface OutgoingOperationEnvelopesFiltered<TMessage, TServiceObject> {
  enrichments: OutgoingOperationEnvelope<TMessage, TServiceObject>[];
  skips: OutgoingOperationEnvelope<TMessage, TServiceObject>[];
}

export namespace builtwith_v17 {
  export interface Options {
    version: "v17";
  }

  export interface Schema$DomainApiRequestParams {
    domain: string;
  }

  export interface Schema$DomainApiResponse {
    Results: Schema$DomainApiResult[];
    Errors: Schema$ApiError[];
  }

  export interface Schema$DomainApiResult {
    Result: {
      IsDB: string; // True, False or Misleading
      Spend: number; // in USD monthly
      SalesRevenue?: number; // in USD monthly
      Paths: Schema$DomainApiResultPath[];
    };
    Meta: Schema$DomainApiResultMeta;
    Attributes: Schema$DomainApiResultAttributes;
  }

  export interface Schema$DomainApiResultPath {
    FirstIndexed: number; // Unix timestamp
    LastIndexed: number; // Unix timestamp
    Domain: string; // The root domain
    Url: string; // A value of dd means this path technology data is built from multiple sub-pages and is only relevant for domain only based lookups.
    SubDomain: string; // A subdomain of the domain, for example a value of blog and a domain of disney.com is the profile for blog.disney.com
    Technologies: Schema$DomainApiResultPathTechnology[];
  }

  export interface Schema$DomainApiResultPathTechnology {
    Name: string;
    Description: string;
    Link: string;
    IsPremium: string; // yes, no or maybe
    Tag: string; // The base category for the technology. See categories index data for all types.
    Categories: string[]; // An array of sub-categories for the tag as listed under main tags on BuiltWith Trends.
  }

  export interface Schema$DomainApiResultMeta {
    CompanyName: string | null;
    City: string;
    Postcode: string;
    State: string;
    Country: string;
    Vertical: string;
    Telephones: string[];
    Emails: string[];
    Names: any[] | null; // Documentation is not clear here
    Majestic: number;
    Umbrella: number;
    ARank: number;
    QRank: number;
  }

  export interface Schema$DomainApiResultAttributes {
    MJRank: number;
    MJTLDRank: number;
    RefSN: number;
    RefIP: number;
    TTFB: number;
    Sitemap: number;
    GTMTags: number;
    QubitTags: number;
    TealiumTags: number;
    AdobeTags: number;
    CDimensions: number;
    CGoals: number;
    CMetrics: number;
    SourceBytes: number;
  }
  export interface Schema$ApiError {
    Lookup?: string | null;
    Message: string;
    Code: number;
  }
}

export const DOMAINAPI_MAPPINGS_V17: { value: string; label: string }[] = [
  {
    value: "Results[0].Result.IsDB",
    label: "Is DB",
  },
  {
    value: "Results[0].Result.Spend",
    label: "Tech Spend (USD)",
  },
  {
    value: "Results[0].Result.SalesRevenue",
    label: "Sales Revenue (USD)",
  },
  {
    value: "$fromMillis($min(Results[0].Result.Paths.FirstIndexed))",
    label: "First Indexed At",
  },
  {
    value: "$fromMillis($min(Results[0].Result.Paths.LastIndexed))",
    label: "Last Indexed At",
  },
  {
    value: "$distinct(Results[0].Result.Paths.Technologies.Name)",
    label: "All Technologies",
  },
  {
    value:
      '$distinct(Results[0].Result.Paths.Technologies[IsPremium="yes"].Name)',
    label: "Premium Technologies",
  },
  {
    value: "Results[0].Meta.CompanyName",
    label: "Company Name",
  },
  {
    value: "Results[0].Meta.City",
    label: "City",
  },
  {
    value: "Results[0].Meta.Postcode",
    label: "Postal Code",
  },
  {
    value: "Results[0].Meta.State",
    label: "State",
  },
  {
    value: "Results[0].Meta.Country",
    label: "Country",
  },
  {
    value: "Results[0].Meta.Vertical",
    label: "Vertical",
  },
  {
    value: "Results[0].Meta.Telephones",
    label: "Telephones",
  },
  {
    value: "Results[0].Meta.Emails",
    label: "Domain Emails",
  },
  {
    value: "Results[0].Meta.Social",
    label: "Social",
  },
  {
    value: "Results[0].Meta.Names",
    label: "Names (for people)",
  },
  {
    value: "Results[0].Meta.Majestic",
    label: "Majestic",
  },
  {
    value: "Results[0].Meta.Umbrella",
    label: "Umbrella",
  },
  {
    value: "Results[0].Meta.ARank",
    label: "ARank",
  },
  {
    value: "Results[0].Meta.QRank",
    label: "QRank",
  },
  {
    value: "Results[0].Attributes.MJRank",
    label: "Majestic Rank",
  },
  {
    value: "Results[0].Attributes.MJTLDRank",
    label: "Majestic Rank for TLD of Domain",
  },
  {
    value: "Results[0].Attributes.RefSN",
    label: "Referring Subnets to Domain from Majestic",
  },
  {
    value: "Results[0].Attributes.RefIP",
    label: "Referring IPs to Domain from Majestic",
  },
  {
    value: "Results[0].Attributes.TTFB",
    label: "Seconds to First Byte",
  },
  {
    value: "Results[0].Attributes.Sitemap",
    label: "Amount of sites in an indexable sitemap",
  },
  {
    value: "Results[0].Attributes.GTMTags",
    label: "Amount of tags being loaded by Google Tag Manager",
  },
  {
    value: "Results[0].Attributes.QubitTags",
    label: "Amount of tags being loaded by Qubit Tag Manager",
  },
  {
    value: "Results[0].Attributes.TealiumTags",
    label: "Amount of tags being loaded by Tealium Tag Manager",
  },
  {
    value: "Results[0].Attributes.AdobeTags",
    label: "Amount of tags being loaded by Adobe Tag Manager",
  },
  {
    value: "Results[0].Attributes.CDimensions",
    label: "Amount of custom dimensions created by Google Analytics",
  },
  {
    value: "Results[0].Attributes.CGoals",
    label: "Amount of custom goals created by Google Analytics",
  },
  {
    value: "Results[0].Attributes.CMetrics",
    label: "Amount of custom metrics created by Google Analytics",
  },
  {
    value: "Results[0].Attributes.SourceBytes",
    label: "Size of document",
  },
];
