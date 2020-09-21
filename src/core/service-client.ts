import {
  builtwith_v17,
  ApiResultObject,
  ApiMethod,
} from "../core/service-objects";
import axios, { AxiosError } from "axios";
import { ApiUtil } from "../utils/api-util";

export class ServiceClient {
  public readonly apiKey: string;

  constructor(options: any) {
    this.apiKey = options.apiKey;
  }

  public async enrichCompanyByDomain(
    params: builtwith_v17.Schema$DomainApiRequestParams,
  ): Promise<
    ApiResultObject<
      undefined,
      builtwith_v17.Schema$DomainApiResponse,
      AxiosError
    >
  > {
    const url = `https://api.builtwith.com/v17/api.json?KEY=${this.apiKey}&LOOKUP=${params.domain}`;
    const method: ApiMethod = "get";

    try {
      const response = await axios.get<builtwith_v17.Schema$DomainApiResponse>(
        url,
      );

      return ApiUtil.handleApiResultSuccess(
        url,
        method,
        undefined,
        response.data,
      );
    } catch (error) {
      return ApiUtil.handleApiResultError(url, method, undefined, error);
    }
  }
}
