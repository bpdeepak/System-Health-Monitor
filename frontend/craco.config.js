// frontend/craco.config.js
module.exports = {
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];

      jestConfig.moduleNameMapper = {
        "\\.css$": "<rootDir>/__mocks__/styleMock.js",
        "recharts": "<rootDir>/__mocks__/recharts.js",
        // ADD THIS LINE FOR AUTHCONTEXT
        "^../context/AuthContext$": "<rootDir>/src/context/AuthContext.js"
      };

      return jestConfig;
    },
  },
};