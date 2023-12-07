import { omit } from "lodash";
import uniqid from "uniqid";
import mongoose from "mongoose";
import {
  GithubUserTokenInterface,
  CreateGithubUserTokenInput,
} from "../../types/github";

type GithubUserTokenDocument = mongoose.Document & GithubUserTokenInterface;

const githubUserTokenSchema = new mongoose.Schema({
  id: String,
  token: String,
  expiresAt: Date,
  refreshToken: String,
  refreshTokenExpiresAt: Date,
  createdAt: Date,
  updatedAt: Date,
});

const GithubUserTokenModel = mongoose.model<GithubUserTokenDocument>(
  "GithubUserToken",
  githubUserTokenSchema
);

const toInterface = (doc: GithubUserTokenDocument): GithubUserTokenInterface =>
  omit(doc.toJSON<GithubUserTokenDocument>(), ["__v", "_id"]);

export const createGithubUserToken = async (
  token: CreateGithubUserTokenInput
) => {
  const doc = await GithubUserTokenModel.create({
    ...token,
    id: uniqid("ghut_"),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return toInterface(doc);
};

export const doesTokenExist = async (tokenId: string) => {
  return await GithubUserTokenModel.exists({ id: tokenId });
};
