import { statusActionFactory } from "./status";
import { accountUpdateHandlerFactory } from "./account-update";
import { metaActionFactory } from "./meta";

export default {
  status: statusActionFactory,
  accountUpdate: accountUpdateHandlerFactory,
  meta: metaActionFactory,
};
