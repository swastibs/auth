export enum NodeEnv {
  LOCAL = "development",
  STAGE = "staging",
  PROD = "production",
}

export const NODE_ENV_VALUES: readonly NodeEnv[] = Object.values(NodeEnv);

export const NODE_ENV_LABEL: Record<NodeEnv, string> = {
  [NodeEnv.LOCAL]: "LOCAL",
  [NodeEnv.STAGE]: "STAGE",
  [NodeEnv.PROD]: "PROD",
};
