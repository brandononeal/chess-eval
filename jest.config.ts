import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Create + migrate the test database once per run (jest.global-setup.ts),
  // and point DATABASE_URL at it before every test file (jest.db-env.ts).
  globalSetup: "<rootDir>/jest.global-setup.ts",
  setupFiles: ["<rootDir>/jest.db-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.claude/", // agent worktrees carry test-file copies
  ],
};

export default config;
