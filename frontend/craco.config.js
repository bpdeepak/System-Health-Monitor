// frontend/craco.config.js
module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Ensure transformIgnorePatterns is still set correctly for axios and chartjs-adapter-date-fns
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];

      // UPDATE THIS SECTION: Configure Jest to mock CSS files AND recharts
      jestConfig.moduleNameMapper = {
        "\\.css$": "<rootDir>/__mocks__/styleMock.js",
        // ADD THIS LINE FOR RECHARTS
        "recharts": "<rootDir>/__mocks__/recharts.js"
      };

      return jestConfig;
    },
  },
};