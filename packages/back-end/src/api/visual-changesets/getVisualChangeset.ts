import { GetVisualChangesetResponse } from "../../../types/openapi";
import { getExperimentById } from "../../models/ExperimentModel";
import {
  findVisualChangesetById,
  toVisualChangesetApiInterface,
} from "../../models/VisualChangesetModel";
import { toExperimentApiInterface } from "../../services/experiments";
import { createApiRequestHandler } from "../../util/handler";
import { getVisualChangesetValidator } from "../../validators/openapi";

export const getVisualChangeset = createApiRequestHandler(
  getVisualChangesetValidator
)(
  async (req): Promise<GetVisualChangesetResponse> => {
    const { organization } = req;
    const { includeExperiment = 0 } = req.query;

    const visualChangeset = await findVisualChangesetById(
      req.params.id,
      organization.id
    );

    if (!visualChangeset) {
      throw new Error("Could not find visualChangeset with given ID");
    }

    const experiment =
      includeExperiment > 0
        ? await getExperimentById(
            organization.id,
            visualChangeset.experiment,
            req.readAccessFilter
          )
        : null;

    const apiExperiment = experiment
      ? await toExperimentApiInterface(
          organization,
          experiment,
          req.readAccessFilter
        )
      : null;

    return {
      visualChangeset: toVisualChangesetApiInterface(visualChangeset),
      ...(apiExperiment ? { experiment: apiExperiment } : {}),
    };
  }
);
