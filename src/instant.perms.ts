import type { AppSchema } from "./instant.schema";

const rules = {
  maps: {
    allow: {
      view: "true",
      create: "false",
      update: "false",
      delete: "false",
    },
  },
  $files: {
    allow: {
      view: "true",
      create: "false",
      delete: "false",
    },
  },
};

export default rules;