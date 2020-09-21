import { builtwith_v17 } from "../core/service-objects";
import { isNil, set, forEach } from "lodash";
import { AxiosError } from "axios";
import { DateTime } from "luxon";
import { PrivateSettings } from "../core/connector";
import { IHullAccountAttributes } from "../types/account";
import { HullConnectorAttributeMapping } from "../types/hull-connector";
import jsonata from "jsonata";

const ATTRIBUTE_GROUP = "builtwith";

export class MappingUtil {
  public readonly appSettings: PrivateSettings;
  constructor(options: any) {
    this.appSettings = options.hullAppSettings;
  }

  public mapEnrichmentApiErroroHullAccountAttributes(
    errorDetails: AxiosError,
  ): IHullAccountAttributes {
    const attributes = {};
    set(attributes, `${ATTRIBUTE_GROUP}/error_details`, errorDetails.message);
    set(attributes, `${ATTRIBUTE_GROUP}/success`, false);
    set(
      attributes,
      `${ATTRIBUTE_GROUP}/last_enriched_at`,
      DateTime.utc().toISO(),
    );
    return attributes;
  }

  public mapEnrichmentResultToHullAccountAttributes(
    enrichResult: builtwith_v17.Schema$DomainApiResponse,
  ): IHullAccountAttributes {
    const attributes = {};

    if (enrichResult.Errors.length != 0) {
      // Handle error result
      set(
        attributes,
        `${ATTRIBUTE_GROUP}/error_details`,
        enrichResult.Errors.map((e) => `${e.Message} (Code: ${e.Code})`)
          .join(". ")
          .trim(),
      );
      set(attributes, `${ATTRIBUTE_GROUP}/success`, false);
      set(
        attributes,
        `${ATTRIBUTE_GROUP}/last_enriched_at`,
        DateTime.utc().toISO(),
      );
    } else {
      forEach(
        this.appSettings.account_attributes_incoming,
        (mapping: HullConnectorAttributeMapping) => {
          if (!isNil(mapping.hull) && !isNil(mapping.service)) {
            // logic goes here
            const expression = jsonata(mapping.service!);
            let result = expression.evaluate(enrichResult);
            if (typeof result === "string" && result === "") {
              result = null;
            }
            if (result === undefined) {
              result = null;
            }
            if (mapping.overwrite === false && result === null) {
              // TODO: Add logging. This is a no-op, so no need to pass it along
            } else {
              set(attributes, mapping.hull, {
                value: result,
                operation: mapping.overwrite === false ? "setIfNull" : "set",
              });
            }
          }
        },
      );
    }

    return attributes;
  }
}
