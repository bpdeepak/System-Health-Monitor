module.exports = {
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];
      jestConfig.moduleNameMapper = {
        "\\.css$": "<rootDir>/__mocks__/styleMock.js",
        "recharts": "<rootDir>/__mocks__/recharts.js",
        "^../context/AuthContext$": "<rootDir>/src/context/AuthContext.js"
      };
      return jestConfig;
    },
  },
};