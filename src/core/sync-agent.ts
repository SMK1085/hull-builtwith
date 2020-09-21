import { AwilixContainer, asClass, asValue } from "awilix";
import { ServiceClient } from "./service-client";
import { LoggingUtil } from "../utils/logging-util";
import { FilterUtil } from "../utils/filter-util";
import { MappingUtil } from "../utils/mapping-util";
import { ConnectorStatusResponse } from "../types/connector-status";
import { Logger } from "winston";
import { PrivateSettings } from "./connector";
import IHullClient from "../types/hull-client";
import { isNil, cloneDeep, forEach } from "lodash";
import {
  STATUS_SETUPREQUIRED_NOAPIKEY,
  ERROR_UNHANDLED_GENERIC,
} from "./messages";
import { ConnectorRedisClient } from "../utils/redis-client";
import IHullAccountUpdateMessage from "../types/account-update-message";
import asyncForEach from "../utils/async-foreach";
import {
  builtwith_v17,
  DOMAINAPI_MAPPINGS_V17,
  OutgoingOperationEnvelope,
} from "./service-objects";
import { FieldsSchema } from "../types/fields-schema";

export class SyncAgent {
  public readonly diContainer: AwilixContainer;

  constructor(container: AwilixContainer) {
    this.diContainer = container;
    const connectorSettings = this.diContainer.resolve<PrivateSettings>(
      "hullAppSettings",
    );
    this.diContainer.register(
      "apiKey",
      asValue(connectorSettings.api_key || "unknown"),
    );
    this.diContainer.register("serviceClient", asClass(ServiceClient));
    this.diContainer.register("loggingUtil", asClass(LoggingUtil));
    this.diContainer.register("filterUtil", asClass(FilterUtil));
    this.diContainer.register("mappingUtil", asClass(MappingUtil));
  }

  /**
   * Processes outgoing notifications for account:update lane.
   *
   * @param {IHullAccountUpdateMessage[]} messages The notification messages.
   * @param {boolean} [isBatch=false] `True` if it is a batch; otherwise `false`.
   * @returns {Promise<unknown>} An awaitable Promise.
   * @memberof SyncAgent
   */
  public async sendAccountMessages(
    messages: IHullAccountUpdateMessage[],
    isBatch = false,
  ): Promise<void> {
    const connectorSettings = this.diContainer.resolve<PrivateSettings>(
      "hullAppSettings",
    );

    if (isNil(connectorSettings.api_key)) {
      // If no API key is configured, return immediately
      return;
    }

    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");
    const hullClient = this.diContainer.resolve<IHullClient>("hullClient");

    try {
      const connectorId = this.diContainer.resolve<string>("hullAppId");
      if (isBatch === true) {
        logger.debug(
          loggingUtil.composeOperationalMessage(
            "OPERATION_SENDACCOUNTMESSAGESBATCH_START",
            correlationKey,
          ),
        );
      } else {
        logger.debug(
          loggingUtil.composeOperationalMessage(
            "OPERATION_SENDACCOUNTMESSAGES_START",
            correlationKey,
          ),
        );
      }

      logger.info(
        loggingUtil.composeMetricMessage(
          "OPERATION_SENDACCOUNTMESSAGES_COUNT",
          correlationKey,
          messages.length,
        ),
      );

      const filterUtil = this.diContainer.resolve<FilterUtil>("filterUtil");
      const envelopesFiltered = filterUtil.filterAccountMessagesInitial(
        messages,
        isBatch,
      );

      forEach(envelopesFiltered.skips, (envelope) => {
        hullClient
          .asAccount(envelope.message.account)
          .logger.info(
            `outgoing.${envelope.objectType}.${envelope.operation}`,
            {
              details: envelope.notes,
            },
          );
      });

      if (envelopesFiltered.enrichments.length === 0) {
        logger.info(
          loggingUtil.composeOperationalMessage(
            "OPERATION_SENDACCOUNTMESSAGES_NOOP",
            correlationKey,
          ),
        );
        return;
      }

      // Process enrichments
      await asyncForEach(
        envelopesFiltered.enrichments,
        (
          envelope: OutgoingOperationEnvelope<
            IHullAccountUpdateMessage,
            builtwith_v17.Schema$DomainApiRequestParams
          >,
        ) => this.processEnrichment(this.diContainer, envelope),
      );

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_SENDACCOUNTMESSAGES_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      console.error(error);
      logger.error(
        loggingUtil.composeErrorMessage(
          "OPERATION_SENDACCOUNTMESSAGES_UNHANDLED",
          cloneDeep(error),
          correlationKey,
        ),
      );
    }
  }

  public async listMetadata(
    objectType: string,
    direction: string,
  ): Promise<FieldsSchema> {
    const fieldSchema: FieldsSchema = {
      error: null,
      ok: true,
      options: [],
    };

    switch (objectType) {
      case "enrichcompany":
        fieldSchema.options = DOMAINAPI_MAPPINGS_V17;
        break;
      default:
        fieldSchema.error = `No metadata for object type '${objectType}' and direction '${direction}' available.`;
        fieldSchema.ok = false;
        break;
    }
    return Promise.resolve(fieldSchema);
  }

  /**
   * Determines the overall status of the connector.
   *
   * @returns {Promise<ConnectorStatusResponse>} The status response.
   * @memberof SyncAgent
   */
  public async determineConnectorStatus(): Promise<ConnectorStatusResponse> {
    const logger = this.diContainer.resolve<Logger>("logger");
    const loggingUtil = this.diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = this.diContainer.resolve<string>("correlationKey");

    const statusResult: ConnectorStatusResponse = {
      status: "ok",
      messages: [],
    };

    try {
      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_START",
          correlationKey,
        ),
      );

      const connectorSettings = this.diContainer.resolve<PrivateSettings>(
        "hullAppSettings",
      );
      const hullClient = this.diContainer.resolve<IHullClient>("hullClient");
      const connectorId = this.diContainer.resolve<string>("hullAppId");

      // Perfom checks to verify setup is complete
      if (isNil(connectorSettings.api_key)) {
        statusResult.status = "setupRequired";
        statusResult.messages.push(STATUS_SETUPREQUIRED_NOAPIKEY);
      }

      const appSecret = this.diContainer.resolve<string>("hullAppSecret");
      const appOrg = this.diContainer.resolve<string>("hullAppOrganization");
      const redisClient = this.diContainer.resolve<ConnectorRedisClient>(
        "redisClient",
      );
      const connectorAuth = {
        id: connectorId,
        secret: appSecret,
        organization: appOrg,
      };
      await redisClient.set(connectorId, connectorAuth, 60 * 60 * 12);

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_STARTHULLAPI",
          correlationKey,
        ),
      );

      await hullClient.put(`${connectorId}/status`, statusResult);

      logger.debug(
        loggingUtil.composeOperationalMessage(
          "OPERATION_CONNECTORSTATUS_SUCCESS",
          correlationKey,
        ),
      );
    } catch (error) {
      const logPayload = loggingUtil.composeErrorMessage(
        "OPERATION_CONNECTORSTATUS_UNHANDLED",
        cloneDeep(error),
        correlationKey,
      );
      logger.error(logPayload);
      statusResult.status = "error";
      if (logPayload && logPayload.message) {
        statusResult.messages.push(logPayload.message);
      } else {
        statusResult.messages.push(ERROR_UNHANDLED_GENERIC);
      }
    }

    return statusResult;
  }

  private async processEnrichment(
    diContainer: AwilixContainer,
    envelope: OutgoingOperationEnvelope<
      IHullAccountUpdateMessage,
      builtwith_v17.Schema$DomainApiRequestParams
    >,
  ): Promise<void> {
    // TODO: Add proper logging
    // Resolve all variables
    const serviceClient = diContainer.resolve<ServiceClient>("serviceClient");
    const mappingUtil = diContainer.resolve<MappingUtil>("mappingUtil");
    const logger = diContainer.resolve<Logger>("logger");
    const loggingUtil = diContainer.resolve<LoggingUtil>("loggingUtil");
    const correlationKey = diContainer.resolve<string>("correlationKey");
    const hullClient = diContainer.resolve<IHullClient>("hullClient");
    const connectorSettings = diContainer.resolve<PrivateSettings>(
      "hullAppSettings",
    );
    const connectorId = this.diContainer.resolve<string>("hullAppId");
    const redisClient = diContainer.resolve<ConnectorRedisClient>(
      "redisClient",
    );

    const alreadyEnriched = await redisClient.get(
      `${connectorId}_enrich_${
        (envelope.serviceObject as builtwith_v17.Schema$DomainApiRequestParams)
          .domain
      }`,
    );
    if (alreadyEnriched !== undefined) {
      await hullClient
        .asAccount(envelope.message.account)
        .logger.info("outgoing.account.skip", {
          reason: "Account already enriched within the past 24 hours.",
        });
      return;
    }
    const enrichResult = await serviceClient.enrichCompanyByDomain(
      envelope.serviceObject as builtwith_v17.Schema$DomainApiRequestParams,
    );

    if (enrichResult.success) {
      await redisClient.set(
        `${connectorId}_enrich_${
          (envelope.serviceObject as builtwith_v17.Schema$DomainApiRequestParams)
            .domain
        }`,
        envelope.serviceObject,
        60 * 60 * 24,
      );
      const enrichAttribs = mappingUtil.mapEnrichmentResultToHullAccountAttributes(
        enrichResult.data!,
      );
      await hullClient
        .asAccount(envelope.message.account)
        .traits(enrichAttribs);
    } else {
      // Enrichment failed, handle the error
      const errorAttribs = mappingUtil.mapEnrichmentApiErroroHullAccountAttributes(
        enrichResult.errorDetails!,
      );
      await hullClient.asAccount(envelope.message.account).traits(errorAttribs);
    }
  }
}
