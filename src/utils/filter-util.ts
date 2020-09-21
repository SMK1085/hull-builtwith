import { Logger } from "winston";
import IHullSegment from "../types/hull-segment";
import IHullAccountUpdateMessage from "../types/account-update-message";
import {
  OutgoingOperationEnvelopesFiltered,
  builtwith_v17,
} from "../core/service-objects";
import { get, intersection, isNil } from "lodash";
import {
  VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT,
  VALIDATION_SKIP_HULLACCOUNT_NODOMAIN,
  VALIDATION_SKIP_HULLACCOUNT_NOREGNO,
} from "../core/messages";
import { PrivateSettings } from "../core/connector";

export class FilterUtil {
  public readonly privateSettings: PrivateSettings;
  public readonly logger: Logger;

  constructor(options: any) {
    this.privateSettings = options.hullAppSettings;
    this.logger = options.logger;
  }

  public filterAccountMessagesInitial(
    messages: IHullAccountUpdateMessage[],
    isBatch: boolean = false,
  ): OutgoingOperationEnvelopesFiltered<
    IHullAccountUpdateMessage,
    builtwith_v17.Schema$DomainApiRequestParams
  > {
    const result: OutgoingOperationEnvelopesFiltered<
      IHullAccountUpdateMessage,
      builtwith_v17.Schema$DomainApiRequestParams
    > = {
      enrichments: [],
      skips: [],
    };

    messages.forEach((msg) => {
      if (
        !isBatch &&
        !FilterUtil.isInAnySegment(
          msg.account_segments,
          this.privateSettings.account_synchronized_segments || [],
        )
      ) {
        result.skips.push({
          message: msg,
          operation: "skip",
          notes: [VALIDATION_SKIP_HULLOBJECT_NOTINANYSEGMENT("account")],
          objectType: "account",
        });
      } else {
        if (isNil(get(msg, "account.domain", null))) {
          result.skips.push({
            message: msg,
            operation: "skip",
            notes: [VALIDATION_SKIP_HULLACCOUNT_NODOMAIN],
            objectType: "account",
          });
        } else {
          result.enrichments.push({
            message: msg,
            operation: "enrich",
            serviceObject: {
              domain: msg.account.domain as string,
            },
            objectType: "account",
          });
        }
      }
    });

    return result;
  }

  private static isInAnySegment(
    actualSegments: IHullSegment[],
    whitelistedSegments: string[],
  ): boolean {
    const actualIds = actualSegments.map((s) => s.id);
    if (intersection(actualIds, whitelistedSegments).length === 0) {
      return false;
    }

    return true;
  }
}
